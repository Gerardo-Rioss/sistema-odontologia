/**
 * Next.js Instrumentation Hook — Sentry + Cron Job Registration.
 *
 * - Initializes Sentry on server and edge runtimes.
 * - Registers a node-cron job that sweeps CONFIRMED appointments
 *   and sends WhatsApp reminders every 15 minutes.
 *
 * Only activates when CRON_ENABLED=true (dev safety).
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // ─── Sentry Init (server & edge) ──────────────────────────
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }

  // ─── Cron Job Registration ────────────────────────────────
  if (process.env.CRON_ENABLED !== "true") {
    console.log(
      "[Instrumentation] CRON_ENABLED is not 'true' — skipping cron job registration"
    );
    return;
  }

  // Dynamic imports to avoid issues during build / client-side bundling
  const cron = await import("node-cron");
  const { reminderService } = await import("@/services/reminder.service");

  cron.default.schedule("*/15 * * * *", async () => {
    try {
      console.log("[Cron] Running reminder sweep...");
      const result = await reminderService.sendAppointmentReminders();
      console.log(
        `[Cron] Reminder sweep complete: sent=${result.sent} failed=${result.failed} skipped=${result.skipped}`
      );
    } catch (error) {
      console.error(
        "[Cron] Reminder sweep failed:",
        error instanceof Error ? error.message : String(error)
      );
    }
  });

  console.log("[Instrumentation] Cron job registered — every 15 minutes");
}
