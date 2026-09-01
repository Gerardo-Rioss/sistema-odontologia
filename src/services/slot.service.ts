/**
 * Slot Service — available appointment slot computation.
 *
 * Extracted from WhatsAppService. Computes free 1-hour appointment
 * slots for a given date and dentist, excluding lunch hour.
 */
import { appointmentRepository } from "@/repositories/appointment.repository";
import { BUSINESS_HOURS } from "@/lib/constants";
import type { AvailableSlot } from "@/types";
import type { IAppointmentReader } from "./types";

// ─── Service ──────────────────────────────────────────────────

export class SlotService {
  constructor(private readonly appointmentRepo: IAppointmentReader) {}

  /**
   * Computes free 1-hour appointment slots for a given date and dentist.
   *
   * Business hours: 8:00–18:00. Lunch block (13:00–14:00) is excluded.
   * Active appointments (PENDING, CONFIRMED) block their time slot.
   * CANCELLED appointments free their slot.
   *
   * @param date — ISO date string (YYYY-MM-DD)
   * @param userId — the dentist's user ID
   * @returns list of available time slots
   */
  async getAvailableSlots(
    date: string,
    userId: string
  ): Promise<AvailableSlot[]> {
    // Query appointments for this dentist via repository
    const appointments = await this.appointmentRepo.findByDentist(userId);

    // Filter to target date, excluding CANCELLED
    const bookedTimes = new Set(
      appointments
        .filter(
          (a) =>
            a.date.toISOString().slice(0, 10) === date &&
            a.status !== "CANCELLED"
        )
        .map((a) => a.time)
    );

    const slots: AvailableSlot[] = [];

    for (let hour = BUSINESS_HOURS.start; hour < BUSINESS_HOURS.end; hour++) {
      // Skip lunch hour
      if (hour === (BUSINESS_HOURS.lunchStart as number)) continue;

      const time = `${hour.toString().padStart(2, "0")}:00`;
      slots.push({
        time,
        available: !bookedTimes.has(time),
      });
    }

    return slots;
  }
}

/** Singleton instance of the slot service. */
export const slotService = new SlotService(
  appointmentRepository as unknown as IAppointmentReader
);
