import { AppointmentService } from "@/services/appointment.service";
import type { IAppointmentRepository, ICalendarSync } from "@/services/types";
import type { Appointment } from "@prisma/client";

function makeAppointment(
  overrides: Partial<
    Appointment & { patient: { id: string; name: string } | null }
  > = {}
): Appointment & { patient: { id: string; name: string } | null } {
  return {
    id: "appt-1",
    patientId: "patient-1",
    userId: "user-1",
    date: new Date("2026-09-01T00:00:00.000Z"),
    time: "10:00",
    type: "LIMPIEZA",
    status: "PENDING",
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

function makeMockRepo(
  overrides: Partial<IAppointmentRepository> = {}
): IAppointmentRepository {
  return {
    findById: jest.fn(),
    findByDentist: jest.fn(),
    findByDentistWithFilters: jest.fn(),
    findByDentistAndTime: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  };
}

function makeMockCalendarSync(): ICalendarSync {
  return {
    syncToCalendar: jest.fn().mockResolvedValue({ success: true, action: "create" as const }),
    deleteFromCalendar: jest.fn().mockResolvedValue({ success: true, action: "delete" as const }),
  };
}

describe("AppointmentService", () => {
  let repo: IAppointmentRepository;
  let calendarSync: ICalendarSync;
  let service: AppointmentService;

  beforeEach(() => {
    repo = makeMockRepo();
    calendarSync = makeMockCalendarSync();
    service = new AppointmentService(repo, calendarSync);
    jest.clearAllMocks();
  });

  describe("schedule", () => {
    it("should schedule an appointment when no conflict exists", async () => {
      const expected = makeAppointment();
      (repo.findByDentistAndTime as jest.Mock).mockResolvedValue(null);
      (repo.create as jest.Mock).mockResolvedValue(expected);

      const result = await service.schedule(
        {
          patientId: "patient-1",
          date: "2026-09-01",
          time: "10:00",
          type: "LIMPIEZA",
        },
        "user-1"
      );

      expect(repo.findByDentistAndTime).toHaveBeenCalledWith(
        "user-1",
        "2026-09-01",
        "10:00",
        undefined
      );
      expect(repo.create).toHaveBeenCalledWith({
        patientId: "patient-1",
        date: new Date("2026-09-01"),
        time: "10:00",
        type: "LIMPIEZA",
        notes: null,
        userId: "user-1",
      });
      expect(result).toEqual(expected);
    });

    it("should throw when a conflict exists at the same date and time", async () => {
      const existing = makeAppointment({
        date: new Date("2026-09-01T12:00:00.000Z"),
        time: "10:00",
      });
      (repo.findByDentistAndTime as jest.Mock).mockResolvedValue(existing);

      await expect(
        service.schedule(
          {
            patientId: "patient-2",
            date: "2026-09-01",
            time: "10:00",
            type: "REVISION",
          },
          "user-1"
        )
      ).rejects.toThrow("Conflicto de horario");

      expect(repo.create).not.toHaveBeenCalled();
    });

    it("should allow same time on a different date", async () => {
      (repo.findByDentistAndTime as jest.Mock).mockResolvedValue(null);
      const expected = makeAppointment({
        date: new Date("2026-09-01T12:00:00.000Z"),
      });
      (repo.create as jest.Mock).mockResolvedValue(expected);

      const result = await service.schedule(
        {
          patientId: "patient-1",
          date: "2026-09-01",
          time: "10:00",
          type: "LIMPIEZA",
        },
        "user-1"
      );

      expect(repo.create).toHaveBeenCalled();
      expect(result).toEqual(expected);
    });
  });

  describe("reschedule", () => {
    it("should reschedule an appointment to a new date/time", async () => {
      const existing = makeAppointment({
        date: new Date("2026-09-01T00:00:00.000Z"),
        time: "10:00",
      });
      const updated = makeAppointment({
        date: new Date("2026-09-05T00:00:00.000Z"),
        time: "14:00",
      });
      (repo.findById as jest.Mock).mockResolvedValue(existing);
      (repo.findByDentistAndTime as jest.Mock).mockResolvedValue(null);
      (repo.update as jest.Mock).mockResolvedValue(updated);

      const result = await service.reschedule(
        "appt-1",
        { date: "2026-09-05", time: "14:00" },
        "user-1"
      );

      expect(repo.findByDentistAndTime).toHaveBeenCalledWith(
        "user-1",
        "2026-09-05",
        "14:00",
        "appt-1"
      );
      expect(repo.update).toHaveBeenCalledWith("appt-1", {
        date: new Date("2026-09-05"),
        time: "14:00",
      });
      expect(result).toEqual(updated);
    });

    it("should throw when appointment not found", async () => {
      (repo.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.reschedule("nonexistent", { date: "2026-09-05" }, "user-1")
      ).rejects.toThrow("Cita no encontrada");
    });

    it("should throw when user does not own the appointment", async () => {
      const otherAppt = makeAppointment({ userId: "user-999" });
      (repo.findById as jest.Mock).mockResolvedValue(otherAppt);

      await expect(
        service.reschedule("appt-1", { date: "2026-09-05" }, "user-1")
      ).rejects.toThrow("No tiene permiso para acceder a esta cita");
    });

    it("should throw on conflict when rescheduling to occupied slot", async () => {
      const existing = makeAppointment({
        date: new Date("2026-09-01T12:00:00.000Z"),
        time: "10:00",
      });
      const conflict = makeAppointment({
        id: "appt-2",
        date: new Date("2026-09-05T12:00:00.000Z"),
        time: "14:00",
      });
      (repo.findById as jest.Mock).mockResolvedValue(existing);
      (repo.findByDentistAndTime as jest.Mock).mockResolvedValue(conflict);

      await expect(
        service.reschedule("appt-1", { date: "2026-09-05", time: "14:00" }, "user-1")
      ).rejects.toThrow("Conflicto de horario");
    });
  });

  describe("cancel", () => {
    it("should cancel a PENDING appointment", async () => {
      const existing = makeAppointment({ status: "PENDING" });
      const cancelled = makeAppointment({ status: "CANCELLED" });
      (repo.findById as jest.Mock).mockResolvedValue(existing);
      (repo.update as jest.Mock).mockResolvedValue(cancelled);

      const result = await service.cancel("appt-1", "user-1");

      expect(repo.update).toHaveBeenCalledWith("appt-1", {
        status: "CANCELLED",
      });
      expect(result.status).toBe("CANCELLED");
    });

    it("should cancel a CONFIRMED appointment", async () => {
      const existing = makeAppointment({ status: "CONFIRMED" });
      const cancelled = makeAppointment({ status: "CANCELLED" });
      (repo.findById as jest.Mock).mockResolvedValue(existing);
      (repo.update as jest.Mock).mockResolvedValue(cancelled);

      const result = await service.cancel("appt-1", "user-1");

      expect(result.status).toBe("CANCELLED");
    });

    it("should throw when appointment is already CANCELLED", async () => {
      const cancelled = makeAppointment({ status: "CANCELLED" });
      (repo.findById as jest.Mock).mockResolvedValue(cancelled);

      await expect(service.cancel("appt-1", "user-1")).rejects.toThrow(
        "La cita ya está cancelada"
      );

      expect(repo.update).not.toHaveBeenCalled();
    });

    it("should throw when appointment not found", async () => {
      (repo.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.cancel("nonexistent", "user-1")).rejects.toThrow(
        "Cita no encontrada"
      );
    });
  });

  describe("confirm", () => {
    it("should confirm a PENDING appointment", async () => {
      const existing = makeAppointment({ status: "PENDING" });
      const confirmed = makeAppointment({ status: "CONFIRMED" });
      (repo.findById as jest.Mock).mockResolvedValue(existing);
      (repo.update as jest.Mock).mockResolvedValue(confirmed);

      const result = await service.confirm("appt-1", "user-1");

      expect(repo.update).toHaveBeenCalledWith("appt-1", {
        status: "CONFIRMED",
      });
      expect(result.status).toBe("CONFIRMED");
    });

    it("should throw when appointment is not PENDING", async () => {
      const confirmed = makeAppointment({ status: "CONFIRMED" });
      (repo.findById as jest.Mock).mockResolvedValue(confirmed);

      await expect(service.confirm("appt-1", "user-1")).rejects.toThrow(
        "Solo se pueden confirmar citas pendientes"
      );

      expect(repo.update).not.toHaveBeenCalled();
    });

    it("should throw when appointment is CANCELLED", async () => {
      const cancelled = makeAppointment({ status: "CANCELLED" });
      (repo.findById as jest.Mock).mockResolvedValue(cancelled);

      await expect(service.confirm("appt-1", "user-1")).rejects.toThrow(
        "Solo se pueden confirmar citas pendientes"
      );
    });

    it("should throw when appointment not found", async () => {
      (repo.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.confirm("nonexistent", "user-1")).rejects.toThrow(
        "Cita no encontrada"
      );
    });
  });

  describe("getAll", () => {
    it("should delegate to repository with no filters", async () => {
      const appts = [
        makeAppointment({ id: "a1" }),
        makeAppointment({ id: "a2" }),
      ];
      (repo.findByDentistWithFilters as jest.Mock).mockResolvedValue(appts);

      const result = await service.getAll("user-1");

      expect(repo.findByDentistWithFilters).toHaveBeenCalledWith(
        "user-1",
        undefined
      );
      expect(result).toHaveLength(2);
    });

    it("should delegate status filter to repository", async () => {
      const appts = [makeAppointment({ id: "a1", status: "PENDING" })];
      (repo.findByDentistWithFilters as jest.Mock).mockResolvedValue(appts);

      const result = await service.getAll("user-1", { status: "PENDING" });

      expect(repo.findByDentistWithFilters).toHaveBeenCalledWith("user-1", {
        status: "PENDING",
      });
      expect(result).toHaveLength(1);
    });

    it("should delegate date filter to repository", async () => {
      const appts = [
        makeAppointment({
          id: "a1",
          date: new Date("2026-09-01T12:00:00.000Z"),
        }),
      ];
      (repo.findByDentistWithFilters as jest.Mock).mockResolvedValue(appts);

      const result = await service.getAll("user-1", { date: "2026-09-01" });

      expect(repo.findByDentistWithFilters).toHaveBeenCalledWith("user-1", {
        date: "2026-09-01",
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("a1");
    });

    it("should delegate search filter to repository", async () => {
      const appts = [
        makeAppointment({
          id: "a1",
          patient: { id: "p1", name: "Juan Perez" },
        }),
      ];
      (repo.findByDentistWithFilters as jest.Mock).mockResolvedValue(appts);

      const result = await service.getAll("user-1", { search: "juan" });

      expect(repo.findByDentistWithFilters).toHaveBeenCalledWith("user-1", {
        search: "juan",
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("a1");
    });
  });

  describe("getById", () => {
    it("should return an appointment after ownership check", async () => {
      const appt = makeAppointment();
      (repo.findById as jest.Mock).mockResolvedValue(appt);

      const result = await service.getById("appt-1", "user-1");

      expect(result).toEqual(appt);
    });

    it("should throw when appointment not found", async () => {
      (repo.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getById("nonexistent", "user-1")
      ).rejects.toThrow("Cita no encontrada");
    });

    it("should throw when user does not own the appointment", async () => {
      const otherAppt = makeAppointment({ userId: "user-999" });
      (repo.findById as jest.Mock).mockResolvedValue(otherAppt);

      await expect(
        service.getById("appt-1", "user-1")
      ).rejects.toThrow("No tiene permiso para acceder a esta cita");
    });
  });

  describe("delete", () => {
    it("should delete an appointment after ownership check", async () => {
      const appt = makeAppointment();
      (repo.findById as jest.Mock).mockResolvedValue(appt);
      (repo.delete as jest.Mock).mockResolvedValue(undefined);

      await service.delete("appt-1", "user-1");

      expect(repo.delete).toHaveBeenCalledWith("appt-1");
    });

    it("should throw when appointment not found", async () => {
      (repo.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.delete("nonexistent", "user-1")
      ).rejects.toThrow("Cita no encontrada");

      expect(repo.delete).not.toHaveBeenCalled();
    });

    it("should throw when user does not own the appointment", async () => {
      const otherAppt = makeAppointment({ userId: "user-999" });
      (repo.findById as jest.Mock).mockResolvedValue(otherAppt);

      await expect(
        service.delete("appt-1", "user-1")
      ).rejects.toThrow("No tiene permiso para acceder a esta cita");

      expect(repo.delete).not.toHaveBeenCalled();
    });
  });
});
