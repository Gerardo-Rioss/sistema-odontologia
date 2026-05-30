/**
 * Reminder Service — automated WhatsApp appointment reminders.
 *
 * Queries CONFIRMED appointments within 24h and 2h windows,
 * sends pre-approved Meta templates, and updates the
 * whatsappReminderSent flag idempotently.
 *
 * Designed to be called by node-cron (instrumentation.ts)
 * or the fallback HTTP endpoint (GET /api/whatsapp/cron/reminders).
 */
import { prisma } from "@/lib/prisma";
import { whatsappService } from "./whatsapp.service";

// ─── Constants ────────────────────────────────────────────────

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

/** Tolerance for the 24h reminder window: ±30 minutes. */
const WINDOW_24H_TOLERANCE_MS = 30 * 60 * 1000;

/** Tolerance for the 2h reminder window: ±15 minutes. */
const WINDOW_2H_TOLERANCE_MS = 15 * 60 * 1000;

/** Delay between individual message sends to avoid Meta rate limits. */
const INTER_SEND_DELAY_MS = 1000;

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Combines a date-only Date and a "HH:mm" time string into a full Date.
 */
function combineDateTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

/**
 * Creates a date-only Date (midnight local time) for the given ISO date string.
 */
function dateOnly(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// ─── Result type ──────────────────────────────────────────────

export interface ReminderResult {
  sent: number;
  failed: number;
  skipped: number;
}

// ─── Service ──────────────────────────────────────────────────

export class ReminderService {
  /**
   * Sweeps CONFIRMED appointments and sends WhatsApp reminders
   * for those falling within the 24h and 2h windows.
   *
   * Idempotent: flag progression null → "24h_sent" → "2h_sent"
   * prevents duplicate sends.
   *
   * Batch processing: sends one by one with a 1s delay between
   * sends to avoid Meta API rate limits.
   *
   * @returns counts of sent, failed, and skipped appointments
   */
  async sendAppointmentReminders(): Promise<ReminderResult> {
    const now = new Date();
    const todayStr = this.formatDate(now);

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = this.formatDate(tomorrow);

    // ── Query: CONFIRMED appointments for today / tomorrow ──
    const appointments = await prisma.appointment.findMany({
      where: {
        status: "CONFIRMED",
        date: {
          in: [dateOnly(todayStr), dateOnly(tomorrowStr)],
        },
        patient: {
          phone: { not: "" },
        },
        OR: [
          { whatsappReminderSent: null },
          { whatsappReminderSent: "24h_sent" },
        ],
      },
      include: {
        patient: true,
      },
      orderBy: { date: "asc" },
    });

    // ── Nothing to do ──
    if (appointments.length === 0) {
      return { sent: 0, failed: 0, skipped: 0 };
    }

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (let i = 0; i < appointments.length; i++) {
      const appointment = appointments[i];
      const appointmentTime = combineDateTime(
        appointment.date,
        appointment.time
      );
      const diffMs = appointmentTime.getTime() - now.getTime();

      // Skip past appointments
      if (diffMs <= 0) {
        skipped++;
        continue;
      }

      // ═══ 24-hour window check ═══
      if (
        appointment.whatsappReminderSent === null &&
        Math.abs(diffMs - TWENTY_FOUR_HOURS_MS) <= WINDOW_24H_TOLERANCE_MS
      ) {
        try {
          await whatsappService.sendTemplate(
            appointment.patient.phone,
            "recordatorio_24h"
          );

          await prisma.appointment.update({
            where: { id: appointment.id },
            data: { whatsappReminderSent: "24h_sent" },
          });

          sent++;
        } catch (error) {
          console.error(
            `[ReminderService] Failed to send 24h reminder for appointment ${appointment.id} (phone: ${appointment.patient.phone}):`,
            error instanceof Error ? error.message : String(error)
          );
          failed++;
        }
      }

      // ═══ 2-hour window check ═══
      else if (
        appointment.whatsappReminderSent === "24h_sent" &&
        Math.abs(diffMs - TWO_HOURS_MS) <= WINDOW_2H_TOLERANCE_MS
      ) {
        try {
          await whatsappService.sendTemplate(
            appointment.patient.phone,
            "recordatorio_2h"
          );

          await prisma.appointment.update({
            where: { id: appointment.id },
            data: { whatsappReminderSent: "2h_sent" },
          });

          sent++;
        } catch (error) {
          console.error(
            `[ReminderService] Failed to send 2h reminder for appointment ${appointment.id} (phone: ${appointment.patient.phone}):`,
            error instanceof Error ? error.message : String(error)
          );
          failed++;
        }
      }

      // ═══ Not in any window ──
      else {
        skipped++;
      }

      // Rate-limit inter-send delay (except after the last item)
      if (i < appointments.length - 1) {
        await this.delay(INTER_SEND_DELAY_MS);
      }
    }

    return { sent, failed, skipped };
  }

  // ─── Helpers ──────────────────────────────────────────────

  /** Formats a Date as YYYY-MM-DD. */
  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  /** Promise-based delay. */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/** Singleton instance of the reminder service. */
export const reminderService = new ReminderService();
