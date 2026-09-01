/**
 * Unit tests for SlotService.
 *
 * Tests:
 *  - All slots available when no appointments
 *  - Booked slot marked unavailable
 *  - Cancelled appointment does not block slot
 *  - Lunch hour (13:00) excluded from slots
 *  - Multiple booked slots
 */
import { SlotService } from "@/services/slot.service";
import type { Appointment } from "@prisma/client";

// ─── Mock IAppointmentReader ─────────────────────────────────

function makeMockAppointmentReader() {
  return {
    findByDentist: jest.fn(),
  };
}

// ─── Helpers ─────────────────────────────────────────────────

function makeAppointment(
  overrides: Partial<Appointment & { patient: { id: string; name: string } | null }> = {}
): Appointment & { patient: { id: string; name: string } | null } {
  return {
    id: "appt-1",
    patientId: "patient-1",
    userId: "user-1",
    date: new Date("2026-09-01T00:00:00.000Z"),
    time: "10:00",
    type: "LIMPIEZA",
    status: "CONFIRMED",
    notes: null,
    googleEventId: null,
    googleCalendarId: null,
    whatsappReminderSent: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    patient: { id: "patient-1", name: "Juan Perez" },
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────

describe("SlotService", () => {
  let reader: ReturnType<typeof makeMockAppointmentReader>;
  let service: SlotService;

  beforeEach(() => {
    reader = makeMockAppointmentReader();
    service = new SlotService(reader as never);
    jest.clearAllMocks();
  });

  describe("getAvailableSlots", () => {
    it("should return all slots available when no appointments exist", async () => {
      (reader.findByDentist as jest.Mock).mockResolvedValue([]);

      const slots = await service.getAvailableSlots("2026-09-01", "user-1");

      expect(reader.findByDentist).toHaveBeenCalledWith("user-1");
      // 8-18 = 10 hours, minus 1 lunch = 9 slots
      expect(slots).toHaveLength(9);
      expect(slots.every((s) => s.available)).toBe(true);
      // Lunch hour (13:00) should not be present
      expect(slots.find((s) => s.time === "13:00")).toBeUndefined();
      // First slot should be 08:00
      expect(slots[0].time).toBe("08:00");
      // Last slot should be 17:00
      expect(slots[slots.length - 1].time).toBe("17:00");
    });

    it("should mark a booked CONFIRMED slot as unavailable", async () => {
      const booked = makeAppointment({
        date: new Date("2026-09-01T00:00:00.000Z"),
        time: "10:00",
        status: "CONFIRMED",
      });
      (reader.findByDentist as jest.Mock).mockResolvedValue([booked]);

      const slots = await service.getAvailableSlots("2026-09-01", "user-1");
      const slot10 = slots.find((s) => s.time === "10:00");

      expect(slot10).toBeDefined();
      expect(slot10!.available).toBe(false);
    });

    it("should mark a booked PENDING slot as unavailable", async () => {
      const booked = makeAppointment({
        date: new Date("2026-09-01T00:00:00.000Z"),
        time: "14:00",
        status: "PENDING",
      });
      (reader.findByDentist as jest.Mock).mockResolvedValue([booked]);

      const slots = await service.getAvailableSlots("2026-09-01", "user-1");
      const slot14 = slots.find((s) => s.time === "14:00");

      expect(slot14).toBeDefined();
      expect(slot14!.available).toBe(false);
    });

    it("should NOT mark a CANCELLED appointment as blocking", async () => {
      const cancelled = makeAppointment({
        date: new Date("2026-09-01T00:00:00.000Z"),
        time: "10:00",
        status: "CANCELLED",
      });
      (reader.findByDentist as jest.Mock).mockResolvedValue([cancelled]);

      const slots = await service.getAvailableSlots("2026-09-01", "user-1");
      const slot10 = slots.find((s) => s.time === "10:00");

      expect(slot10).toBeDefined();
      expect(slot10!.available).toBe(true);
    });

    it("should exclude the lunch hour from slots", async () => {
      (reader.findByDentist as jest.Mock).mockResolvedValue([]);

      const slots = await service.getAvailableSlots("2026-09-01", "user-1");

      expect(slots.find((s) => s.time === "13:00")).toBeUndefined();
    });

    it("should handle multiple booked slots", async () => {
      const appts = [
        makeAppointment({
          date: new Date("2026-09-01T00:00:00.000Z"),
          time: "09:00",
          status: "CONFIRMED",
        }),
        makeAppointment({
          id: "appt-2",
          date: new Date("2026-09-01T00:00:00.000Z"),
          time: "14:00",
          status: "PENDING",
        }),
      ];
      (reader.findByDentist as jest.Mock).mockResolvedValue(appts);

      const slots = await service.getAvailableSlots("2026-09-01", "user-1");

      expect(slots.find((s) => s.time === "09:00")!.available).toBe(false);
      expect(slots.find((s) => s.time === "14:00")!.available).toBe(false);
      expect(slots.find((s) => s.time === "10:00")!.available).toBe(true);
    });
  });
});
