import { NextRequest, NextResponse } from "next/server";
import { reminderService } from "@/services/reminder.service";

/**
 * Fallback HTTP trigger for WhatsApp reminder sweep.
 *
 * GET /api/whatsapp/cron/reminders
 *
 * Protected by the x-cron-secret header. When node-cron in
 * instrumentation.ts is not available (e.g., serverless deployments),
 * an external cron service can hit this endpoint.
 */
export async function GET(request: NextRequest) {
  try {
    // ── Secret validation ──
    const expectedSecret = process.env.CRON_SECRET;
    if (!expectedSecret) {
      console.warn("[CronReminders] CRON_SECRET not configured — denying request");
      return NextResponse.json(
        { error: "Cron endpoint not configured" },
        { status: 500 }
      );
    }

    const providedSecret = request.headers.get("x-cron-secret");
    if (providedSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Run reminder sweep ──
    console.log("[CronReminders] Running reminder sweep via HTTP trigger...");
    const result = await reminderService.sendAppointmentReminders();
    console.log(`[CronReminders] Sweep complete: ${JSON.stringify(result)}`);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[CronReminders] Sweep failed:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
