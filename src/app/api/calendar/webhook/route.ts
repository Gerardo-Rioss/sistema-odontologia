import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { calendarService } from "@/services/calendar.service";
import { calendarRepository } from "@/repositories/calendar.repository";

/**
 * Google Calendar push notification webhook receiver.
 *
 * GET /api/calendar/webhook
 * - Handles Google's channel verification (responds with `challenge`).
 *
 * POST /api/calendar/webhook
 * - Receives push notifications from Google Calendar.
 * - Validates the `X-Goog-Channel-Token` header for authenticity.
 * - Dispatches by `X-Goog-Resource-State`:
 *   - `sync`      → initial sync confirmation, acknowledge with 200.
 *   - `exists`    → a resource changed, trigger incremental catchUpSync.
 *   - `not_exists` → a resource was deleted, trigger catchUpSync.
 * - Also handles webhook channel renewal/expiry.
 */

/** Expected channel token — must match what was sent when creating the webhook channel. */
function getExpectedChannelToken(): string {
  return process.env.NEXTAUTH_SECRET ?? "calendar-webhook-secret";
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const challenge = searchParams.get("challenge");

    if (!challenge) {
      return new NextResponse("Missing challenge parameter", { status: 400 });
    }

    // Respond with the challenge value as plain text (Google requirement)
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  } catch (error) {
    console.error("[CalendarWebhook] GET error:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // ── Extract Google push notification headers ─────────────
    const channelToken = request.headers.get("x-goog-channel-token");
    const resourceState = request.headers.get("x-goog-resource-state");
    const channelId = request.headers.get("x-goog-channel-id");
    const resourceId = request.headers.get("x-goog-resource-id");

    // ── Authenticate the webhook ─────────────────────────────
    const expectedToken = getExpectedChannelToken();
    if (!channelToken || channelToken !== expectedToken) {
      console.warn(
        `[CalendarWebhook] Invalid channel token received: ${channelToken?.slice(0, 10)}...`
      );
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log(
      `[CalendarWebhook] Received push — state: ${resourceState}, channel: ${channelId}, resource: ${resourceId}`
    );

    // ── Resolve the user who owns this channel ──────────────
    // Find CalendarConnection by googleChannelId to identify the user
    let userId: string | null = null;

    // Try to determine user from the channel/resource combination
    // Since we store googleChannelId on CalendarConnection, look it up
    try {
      // We need to search by channelId — for now, iterate or use a raw query
      // Google sends channelId that we stored when creating the channel
      const { prisma } = await import("@/lib/prisma");
      if (channelId) {
        const connection = await prisma.calendarConnection.findFirst({
          where: { googleChannelId: channelId },
          select: { userId: true },
        });
        if (connection) {
          userId = connection.userId;
        }
      }
    } catch {
      console.warn(
        "[CalendarWebhook] Could not resolve user from channel ID; falling back to session"
      );
    }

    // Fallback: try to get user from session (less reliable for webhooks)
    if (!userId) {
      const session = await auth();
      if (session?.user?.id) {
        userId = session.user.id;
      }
    }

    if (!userId) {
      console.warn(
        "[CalendarWebhook] Could not identify user for webhook notification"
      );
      return NextResponse.json(
        { error: "Could not identify resource owner" },
        { status: 404 }
      );
    }

    // ── Dispatch by resource state ──────────────────────────
    switch (resourceState) {
      case "sync":
        // Initial sync confirmation — acknowledge, no data sync needed.
        // Channel is now active.
        console.log("[CalendarWebhook] Channel sync confirmed");
        return NextResponse.json({ success: true, action: "acknowledged" });

      case "exists":
        // Something was created or updated on the calendar.
        // Trigger an incremental catch-up sync.
        // Fire-and-forget: don't wait for sync to complete.
        calendarService.catchUpSync(userId).catch((err) =>
          console.error(
            "[CalendarWebhook] Background catchUpSync failed:",
            err
          )
        );
        return NextResponse.json({
          success: true,
          action: "sync_queued",
        });

      case "not_exists":
        // The watched resource (calendar) was deleted.
        // Mark the connection as expired and clean up.
        console.warn(
          `[CalendarWebhook] Resource ${resourceId} no longer exists. Marking connection as expired.`
        );
        calendarRepository.updateStatus(userId, "EXPIRED").catch((err) =>
          console.error(
            "[CalendarWebhook] Failed to update connection status:",
            err
          )
        );
        return NextResponse.json({
          success: true,
          action: "resource_gone",
        });

      default:
        console.warn(
          `[CalendarWebhook] Unknown resource state: ${resourceState}`
        );
        return NextResponse.json({ success: true, action: "ignored" });
    }
  } catch (error) {
    console.error("[CalendarWebhook] POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
