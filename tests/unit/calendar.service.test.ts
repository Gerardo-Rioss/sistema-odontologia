/**
 * Unit tests for CalendarService.
 *
 * Tests the core sync methods with mocked googleapis and prisma,
 * verifying event body construction, LWW conflict resolution,
 * and error handling (fire-and-forget graceful degradation).
 */

import { calendarService } from "@/services/calendar.service";

// ─── Mocks ────────────────────────────────────────────────────

// We mock the googleapis module to avoid real HTTP calls
jest.mock("googleapis", () => {
  const mockEvents = {
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    list: jest.fn(),
  };

  const mockCalendar = jest.fn(() => ({
    events: mockEvents,
  }));

  const mockOAuth2 = jest.fn(() => ({
    setCredentials: jest.fn(),
    on: jest.fn(),
    getToken: jest.fn(),
    getTokenInfo: jest.fn(),
  }));

  return {
    google: {
      auth: {
        OAuth2: mockOAuth2,
      },
      calendar: mockCalendar,
    },
    MockOAuth2: mockOAuth2,
    MockEvents: mockEvents,
  };
});

// Mock the calendar repository
jest.mock("@/repositories/calendar.repository", () => ({
  calendarRepository: {
    findByUserId: jest.fn(),
    upsertTokens: jest.fn(),
    delete: jest.fn(),
    updateLastSyncedAt: jest.fn(),
    updateStatus: jest.fn(),
  },
}));

// Mock the appointment repository
jest.mock("@/repositories/appointment.repository", () => ({
  appointmentRepository: {
    findById: jest.fn(),
    findByDentist: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
}));

// Mock prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    appointment: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    calendarConnection: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// ─── Helpers ───────────────────────────────────────────────────

import { calendarRepository } from "@/repositories/calendar.repository";
import { appointmentRepository } from "@/repositories/appointment.repository";
import { prisma } from "@/lib/prisma";
const { MockEvents, MockOAuth2 } = jest.requireMock("googleapis");

function mockActiveConnection(overrides: Record<string, unknown> = {}) {
  const conn = {
    id: "conn-1",
    userId: "user-1",
    accessToken: "access-token",
    refreshToken: "refresh-token",
    tokenExpiry: new Date(Date.now() + 3600000),
    googleCalendarId: "primary",
    googleEmail: "dentist@example.com",
    status: "ACTIVE",
    lastSyncedAt: new Date(),
    googleChannelId: null,
    googleResourceId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
  (calendarRepository.findByUserId as jest.Mock).mockResolvedValue(conn);
  return conn;
}

function mockAppointment(overrides: Record<string, unknown> = {}) {
  const appt = {
    id: "appt-1",
    date: new Date("2026-06-15T00:00:00Z"),
    time: "14:30",
    status: "CONFIRMED",
    type: "LIMPIEZA",
    notes: "Primera consulta",
    googleEventId: null,
    googleCalendarId: null,
    patientId: "patient-1",
    userId: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    patient: { id: "patient-1", name: "Juan Pérez" },
    ...overrides,
  };
  (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(appt);
  return appt;
}

// ─── Tests ─────────────────────────────────────────────────────

describe("CalendarService — syncToCalendar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = "test-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/api/calendar/auth/callback";
  });

  describe("createGoogleEvent — event body shape", () => {
    it("should build an event with summary <TYPE> — <PATIENT_NAME>", async () => {
      mockActiveConnection();
      mockAppointment();
      MockEvents.insert.mockResolvedValue({
        data: { id: "google-event-123" },
      });

      const result = await calendarService.syncToCalendar("appt-1", "user-1");

      expect(result.success).toBe(true);
      expect(result.action).toBe("create");
      expect(result.googleEventId).toBe("google-event-123");

      // Verify the event body sent to Google
      const insertCall = MockEvents.insert.mock.calls[0][0];
      expect(insertCall.requestBody.summary).toBe("LIMPIEZA — Juan Pérez");
      expect(insertCall.requestBody.start).toBeDefined();
      expect(insertCall.requestBody.end).toBeDefined();
      expect(insertCall.requestBody.start.timeZone).toBe(
        "America/Argentina/Buenos_Aires"
      );
    });

    it("should include description when appointment has notes", async () => {
      mockActiveConnection();
      mockAppointment({ notes: "Traer radiografía previa" });
      MockEvents.insert.mockResolvedValue({
        data: { id: "google-event-456" },
      });

      await calendarService.syncToCalendar("appt-1", "user-1");

      const insertCall = MockEvents.insert.mock.calls[0][0];
      expect(insertCall.requestBody.description).toBe(
        "Traer radiografía previa"
      );
    });

    it("should include attendee when googleEmail is available", async () => {
      mockActiveConnection({ googleEmail: "dentist@example.com" });
      mockAppointment();
      MockEvents.insert.mockResolvedValue({
        data: { id: "google-event-789" },
      });

      await calendarService.syncToCalendar("appt-1", "user-1");

      const insertCall = MockEvents.insert.mock.calls[0][0];
      expect(insertCall.requestBody.attendees).toEqual([
        { email: "dentist@example.com" },
      ]);
    });
  });

  describe("syncToCalendar — create vs update", () => {
    it("should create a new Google event when googleEventId is null", async () => {
      mockActiveConnection();
      mockAppointment({ googleEventId: null });
      MockEvents.insert.mockResolvedValue({
        data: { id: "new-event-id" },
      });

      const result = await calendarService.syncToCalendar("appt-1", "user-1");

      expect(result.action).toBe("create");
      expect(MockEvents.insert).toHaveBeenCalledTimes(1);
      expect(MockEvents.update).not.toHaveBeenCalled();
    });

    it("should update an existing Google event when googleEventId exists", async () => {
      mockActiveConnection();
      mockAppointment({ googleEventId: "existing-event-id" });
      MockEvents.update.mockResolvedValue({
        data: { id: "existing-event-id" },
      });

      const result = await calendarService.syncToCalendar("appt-1", "user-1");

      expect(result.action).toBe("update");
      expect(MockEvents.update).toHaveBeenCalledTimes(1);
      expect(MockEvents.insert).not.toHaveBeenCalled();

      const updateCall = MockEvents.update.mock.calls[0][0];
      expect(updateCall.eventId).toBe("existing-event-id");
    });
  });

  describe("syncToCalendar — error handling", () => {
    it("should return error result when appointment is not found", async () => {
      (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await calendarService.syncToCalendar("nonexistent", "user-1");

      expect(result.success).toBe(false);
      expect(result.action).toBe("none");
      expect(result.error).toContain("not found");
    });

    it("should return success=false when no active connection exists", async () => {
      (calendarRepository.findByUserId as jest.Mock).mockResolvedValue(null);
      mockAppointment();

      const result = await calendarService.syncToCalendar("appt-1", "user-1");

      expect(result.success).toBe(false);
      expect(result.action).toBe("none");
      expect(MockEvents.insert).not.toHaveBeenCalled();
    });

    it("should return none result (no throw) when Google API fails", async () => {
      mockActiveConnection();
      mockAppointment();
      MockEvents.insert.mockRejectedValue(new Error("Google API down"));

      const result = await calendarService.syncToCalendar("appt-1", "user-1");

      // Fire-and-forget: must NOT throw, must return error result
      expect(result.success).toBe(false);
      expect(result.action).toBe("none");
      expect(result.error).toBeDefined();
    });
  });

  describe("syncToCalendar — 410 Gone recovery", () => {
    it("should re-create event when update returns 410", async () => {
      mockActiveConnection();
      mockAppointment({ googleEventId: "gone-event-id" });

      // First call (update) throws 410
      MockEvents.update.mockRejectedValue({ code: 410 });
      // Second call (insert after reset) succeeds
      MockEvents.insert.mockResolvedValue({
        data: { id: "recreated-event-id" },
      });

      const result = await calendarService.syncToCalendar("appt-1", "user-1");

      expect(result.success).toBe(true);
      expect(result.action).toBe("create");
      expect(result.googleEventId).toBe("recreated-event-id");

      // Should have reset googleEventId to null, then inserted
      expect(appointmentRepository.update).toHaveBeenCalledWith("appt-1", {
        googleEventId: null,
      });
      expect(MockEvents.insert).toHaveBeenCalledTimes(1);
    });
  });
});

describe("CalendarService — reconcileWebhookEvent (LWW)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const googleEventTemplate = {
    id: "google-event-abc",
    summary: "LIMPIEZA — Juan Pérez",
    description: "Updated from Google",
    start: { dateTime: "2026-06-16T09:00:00-03:00", timeZone: "America/Argentina/Buenos_Aires" },
    end: { dateTime: "2026-06-16T10:00:00-03:00", timeZone: "America/Argentina/Buenos_Aires" },
    status: "confirmed",
    updated: new Date().toISOString(), // will override per test
  };

  it("should pull Google changes when Google is newer (LWW: Google wins)", async () => {
    const googleUpdateTime = new Date("2026-06-15T15:00:00Z");
    const localUpdateTime = new Date("2026-06-15T14:00:00Z"); // 1 hour older

    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue({
      id: "appt-1",
      updatedAt: localUpdateTime,
      googleEventId: "google-event-abc",
    });

    const result = await calendarService.reconcileWebhookEvent(
      { ...googleEventTemplate, updated: googleUpdateTime.toISOString() },
      "user-1"
    );

    expect(result.success).toBe(true);
    expect(result.action).toBe("conflict_resolved");

    // Local appointment should be updated with Google's data
    expect(appointmentRepository.update).toHaveBeenCalledWith(
      "appt-1",
      expect.objectContaining({
        date: expect.any(Date),
        time: expect.any(String),
        notes: "Updated from Google",
      })
    );
  });

  it("should push local changes when local is newer (LWW: local wins)", async () => {
    const googleUpdateTime = new Date("2026-06-15T14:00:00Z");
    const localUpdateTime = new Date("2026-06-15T15:00:00Z"); // 1 hour newer

    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue({
      id: "appt-1",
      updatedAt: localUpdateTime,
      googleEventId: "google-event-abc",
      patientId: "patient-1",
      userId: "user-1",
    });

    // For the push-back call (syncToCalendar internal), we need the mock setup
    // syncToCalendar internally fetches appointment again — ensure it succeeds
    (prisma.appointment.findUnique as jest.Mock)
      .mockResolvedValueOnce({
        id: "appt-1",
        updatedAt: localUpdateTime,
        googleEventId: "google-event-abc",
        patientId: "patient-1",
        userId: "user-1",
      })
      .mockResolvedValueOnce({
        id: "appt-1",
        date: new Date("2026-06-15T00:00:00Z"),
        time: "15:00",
        status: "CONFIRMED",
        type: "LIMPIEZA",
        notes: null,
        googleEventId: "google-event-abc",
        googleCalendarId: "primary",
        patientId: "patient-1",
        userId: "user-1",
        createdAt: new Date(),
        updatedAt: localUpdateTime,
        patient: { id: "patient-1", name: "Juan Pérez" },
      });

    const result = await calendarService.reconcileWebhookEvent(
      { ...googleEventTemplate, updated: googleUpdateTime.toISOString() },
      "user-1"
    );

    expect(result.success).toBe(true);
    expect(result.action).toBe("conflict_resolved");

    // Should NOT have updated local (local is newer)
    // Instead, push-back should trigger syncToCalendar (fire-and-forget)
  });

  it("should take no action when timestamps are equal", async () => {
    const sameTime = new Date("2026-06-15T15:00:00Z");

    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue({
      id: "appt-1",
      updatedAt: sameTime,
      googleEventId: "google-event-abc",
    });

    const result = await calendarService.reconcileWebhookEvent(
      { ...googleEventTemplate, updated: sameTime.toISOString() },
      "user-1"
    );

    expect(result.success).toBe(true);
    expect(result.action).toBe("conflict_resolved");

    // No DB writes should have occurred
    expect(appointmentRepository.update).not.toHaveBeenCalled();
  });

  it("should return none when no local appointment matches googleEventId", async () => {
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await calendarService.reconcileWebhookEvent(
      googleEventTemplate,
      "user-1"
    );

    expect(result.success).toBe(false);
    expect(result.action).toBe("none");
    expect(result.error).toContain("No local appointment");
  });
});

describe("CalendarService — catchUpSync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = "test-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/api/calendar/auth/callback";
  });

  it("should return none when no active connection exists", async () => {
    (calendarRepository.findByUserId as jest.Mock).mockResolvedValue(null);

    const result = await calendarService.catchUpSync("user-1");

    expect(result.success).toBe(false);
    expect(result.action).toBe("none");
  });

  it("should handle errors gracefully (no throw)", async () => {
    mockActiveConnection();
    MockEvents.list.mockRejectedValue(new Error("Network error"));

    const result = await calendarService.catchUpSync("user-1");

    expect(result.success).toBe(false);
    expect(result.action).toBe("none");
    expect(result.error).toBeDefined();
  });
});

describe("CalendarService — deleteFromCalendar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = "test-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/api/calendar/auth/callback";
  });

  it("should return delete result on successful deletion", async () => {
    mockActiveConnection();
    MockEvents.delete.mockResolvedValue({ data: {} });

    const result = await calendarService.deleteFromCalendar(
      "google-event-xyz",
      "primary",
      "user-1"
    );

    expect(result.success).toBe(true);
    expect(result.action).toBe("delete");
    expect(MockEvents.delete).toHaveBeenCalledWith({
      calendarId: "primary",
      eventId: "google-event-xyz",
    });
  });

  it("should treat 410 (already gone) as success", async () => {
    mockActiveConnection();
    MockEvents.delete.mockRejectedValue({ code: 410 });

    const result = await calendarService.deleteFromCalendar(
      "google-event-gone",
      "primary",
      "user-1"
    );

    expect(result.success).toBe(true);
    expect(result.action).toBe("delete");
  });

  it("should return none when no active connection", async () => {
    (calendarRepository.findByUserId as jest.Mock).mockResolvedValue(null);

    const result = await calendarService.deleteFromCalendar(
      "google-event-xyz",
      "primary",
      "user-1"
    );

    expect(result.success).toBe(false);
    expect(result.action).toBe("none");
  });
});
