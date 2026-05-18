import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { whatsappService } from "@/services/whatsapp.service";
import { conversationService } from "@/services/conversation.service";

/**
 * WhatsApp Cloud API Webhook.
 *
 * GET  /api/whatsapp/webhook — hub.challenge verification (Meta).
 * POST /api/whatsapp/webhook — receive inbound messages & status updates.
 */

// ─── GET: Webhook verification ───────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (!expectedToken) {
    console.error("[Webhook] WHATSAPP_VERIFY_TOKEN is not configured");
    return new NextResponse("Webhook not configured", { status: 500 });
  }

  if (mode === "subscribe" && token === expectedToken && challenge) {
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

// ─── POST: Receive messages ──────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // ── 1. Read raw body (for signature verification) ──
    const rawBody = await request.text();

    // ── 2. Validate HMAC-SHA256 signature ──
    const signatureHeader = request.headers.get("X-Hub-Signature-256");
    const appSecret = process.env.WHATSAPP_APP_SECRET;

    if (appSecret && signatureHeader) {
      const expectedSignature = `sha256=${crypto
        .createHmac("sha256", appSecret)
        .update(rawBody)
        .digest("hex")}`;

      if (signatureHeader !== expectedSignature) {
        console.warn("[Webhook] Invalid signature received");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    } else if (!appSecret) {
      console.warn(
        "[Webhook] WHATSAPP_APP_SECRET not configured — skipping signature validation"
      );
    }

    // ── 3. Parse payload ──
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const entries = payload.entry as Array<Record<string, unknown>> | undefined;
    if (!entries || entries.length === 0) {
      return NextResponse.json(
        { message: "No entries in payload" },
        { status: 200 }
      );
    }

    // ── 4. Process each entry ──
    for (const entry of entries) {
      const changes =
        (entry.changes as Array<Record<string, unknown>>) || [];
      for (const change of changes) {
        const value = change.value as Record<string, unknown> | undefined;
        if (!value) continue;

        const messages = value.messages as Array<Record<string, unknown>> | undefined;
        const statuses = value.statuses as Array<Record<string, unknown>> | undefined;

        // Handle status updates (sent, delivered, read) — log only
        if (statuses && statuses.length > 0) {
          for (const status of statuses) {
            const statusType = status.status as string;
            const waMessageId = status.id as string;
            console.log(
              `[Webhook] Status update: ${statusType} for message ${waMessageId}`
            );
          }
          continue; // No further processing for status-only payloads
        }

        // Handle messages
        if (messages && messages.length > 0) {
          // Process each message through the pipeline
          for (let i = 0; i < messages.length; i++) {
            try {
              // Parse the message via WhatsAppService — persists inbound + returns data
              // We reconstruct the minimal payload the service expects
              const extracted = await whatsappService.processIncomingMessage({
                object: "whatsapp_business_account",
                entry: [
                  {
                    id: entry.id as string,
                    changes: [
                      {
                        value: value as never,
                        field: change.field as string,
                      },
                    ],
                  },
                ],
              });

              // Mark the message as read on WhatsApp (fire-and-forget)
              whatsappService
                .markAsRead(extracted.messageId)
                .catch((err) =>
                  console.error(
                    `[Webhook] Failed to mark message ${extracted.messageId} as read:`,
                    err
                  )
                );

              // Process conversation — send reply before returning 200
              // WhatsApp API calls are sub-second, well within Meta's 20s timeout
              await conversationService.handleMessage(
                extracted.phoneNumber,
                extracted.messageText
              );
            } catch (error) {
              // processIncomingMessage throws for non-message payloads (e.g., statuses
              // nested alongside messages). Log and continue.
              const errMsg =
                error instanceof Error ? error.message : String(error);
              if (
                errMsg.includes("No messages") ||
                errMsg.includes("status update")
              ) {
                console.log(`[Webhook] Skipping non-message entry: ${errMsg}`);
              } else {
                console.error(`[Webhook] Error processing entry: ${errMsg}`);
              }
            }
          }
        }
      }
    }

    // ── 5. Return 200 immediately (Meta requires fast response) ──
    return NextResponse.json({ message: "OK" }, { status: 200 });
  } catch (error) {
    console.error("[Webhook] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 200 } // Still 200 so Meta doesn't retry
    );
  }
}
