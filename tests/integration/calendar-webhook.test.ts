/**
 * Integration tests for Google Calendar webhook reconciliation.
 *
 * Tests the POST /api/calendar/webhook endpoint:
 * - Channel token authentication.
 * - Resource state dispatch (sync, exists, not_exists).
 * - Channel verification (GET challenge).
 *
 * Also tests the GET /api/calendar/sync health endpoint.
 */

// ─── Mocks ────────────────────────────────────────────────────

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

const mockCalendarRepo = {
  findByUserId: jest.fn(),
  upsertTokens: jest.fn(),
  delete: jest.fn(),
  updateLastSyncedAt: jest.fn(),
  updateStatus: jest.fn().mockResolvedValue(undefined),
};

jest.mock("@/repositories/calendar.repository", () => ({
  calendarRepository: mockCalendarRepo,
}));

// Mock the calendar service to avoid real Google API calls
const mockCalendarService = {
  catchUpSync: jest.fn(),
  syncToCalendar: jest.fn(),
  reconcileWebhookEvent: jest.fn(),
};

jest.mock("@/services/calendar.service", () => ({
  calendarService: mockCalendarService,
}));

// Mock prisma for the channel lookup in webhook
jest.mock("@/lib/prisma", () => ({
  prisma: {
    calendarConnection: {
      findFirst: jest.fn(),
    },
    appointment: {
      findUnique: jest.fn(),
    },
  },
}));

// ─── Helpers ───────────────────────────────────────────────────

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function mockSession(userId = "user-1") {
  (auth as jest.Mock).mockResolvedValue({
    user: { id: userId, email: "dentist@test.com", role: "DENTIST" },
  });
}

function mockNoSession() {
  (auth as jest.Mock).mockResolvedValue(null);
}

/**
 * Builds a webhook POST request with the given Google push notification headers.
 */
function buildWebhookRequest(headers: Record<string, string>): NextRequest {
  return new NextRequest("http://localhost:3000/api/calendar/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify({}),
  });
}

/**
 * Builds a webhook GET request with challenge param.
 */
function buildChallengeRequest(challenge: string): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/calendar/webhook?challenge=${challenge}`
  );
}

// ─── Tests ────────────────────────────────────────────────────

describe("Webhook — GET channel verification", () => {
  it("should respond with the challenge value as plain text", async () => {
    const { GET } = await import("@/app/api/calendar/webhook/route");

    const response = await GET(buildChallengeRequest("test-challenge-123"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/plain");

    const text = await response.text();
    expect(text).toBe("test-challenge-123");
  });

  it("should return 400 when challenge parameter is missing", async () => {
    const { GET } = await import("@/app/api/calendar/webhook/route");

    const response = await GET(
      new NextRequest("http://localhost:3000/api/calendar/webhook")
    );

    expect(response.status).toBe(400);
  });
});

describe("Webhook — POST push notifications", () => {
  const VALID_TOKEN = process.env.NEXTAUTH_SECRET ?? "calendar-webhook-secret";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("authentication", () => {
    it("should return 403 when X-Goog-Channel-Token is missing", async () => {
      mockSession("user-1");

      const { POST } = await import("@/app/api/calendar/webhook/route");
      const response = await POST(
        buildWebhookRequest({
          "x-goog-resource-state": "sync",
        })
      );

      expect(response.status).toBe(403);
    });

    it("should return 403 when X-Goog-Channel-Token is invalid", async () => {
      mockSession("user-1");

      const { POST } = await import("@/app/api/calendar/webhook/route");
      const response = await POST(
        buildWebhookRequest({
          "x-goog-channel-token": "wrong-token",
          "x-goog-resource-state": "sync",
        })
      );

      expect(response.status).toBe(403);
    });

    it("should return 404 when user cannot be identified", async () => {
      mockNoSession();
      // Channel lookup returns null
      (prisma.calendarConnection.findFirst as jest.Mock).mockResolvedValue(
        null
      );

      const { POST } = await import("@/app/api/calendar/webhook/route");
      const response = await POST(
        buildWebhookRequest({
          "x-goog-channel-token": VALID_TOKEN,
          "x-goog-resource-state": "sync",
          "x-goog-channel-id": "unknown-channel",
          "x-goog-resource-id": "unknown-resource",
        })
      );

      expect(response.status).toBe(404);
    });
  });

  describe("resource state dispatch", () => {
    it("should acknowledge sync state with 200 (no data sync)", async () => {
      mockSession("user-1");

      const { POST } = await import("@/app/api/calendar/webhook/route");
      const response = await POST(
        buildWebhookRequest({
          "x-goog-channel-token": VALID_TOKEN,
          "x-goog-resource-state": "sync",
          "x-goog-channel-id": "channel-1",
          "x-goog-resource-id": "resource-1",
        })
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.action).toBe("acknowledged");

      // Should NOT trigger catchUpSync on sync state
      expect(mockCalendarService.catchUpSync).not.toHaveBeenCalled();
    });

    it("should queue catchUpSync on exists state", async () => {
      mockSession("user-1");
      mockCalendarService.catchUpSync.mockResolvedValue({
        success: true,
        action: "update",
      });

      const { POST } = await import("@/app/api/calendar/webhook/route");
      const response = await POST(
        buildWebhookRequest({
          "x-goog-channel-token": VALID_TOKEN,
          "x-goog-resource-state": "exists",
          "x-goog-channel-id": "channel-1",
          "x-goog-resource-id": "resource-1",
        })
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.action).toBe("sync_queued");

      // catchUpSync should be called (fire-and-forget, but we await for test)
      expect(mockCalendarService.catchUpSync).toHaveBeenCalledWith("user-1");
    });

    it("should mark connection as EXPIRED on not_exists state", async () => {
      mockSession("user-1");

      const { POST } = await import("@/app/api/calendar/webhook/route");
      const response = await POST(
        buildWebhookRequest({
          "x-goog-channel-token": VALID_TOKEN,
          "x-goog-resource-state": "not_exists",
          "x-goog-channel-id": "channel-1",
          "x-goog-resource-id": "resource-1",
        })
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.action).toBe("resource_gone");

      // Should mark connection as EXPIRED
      expect(mockCalendarRepo.updateStatus).toHaveBeenCalledWith(
        "user-1",
        "EXPIRED"
      );
    });

    it("should ignore unknown resource states", async () => {
      mockSession("user-1");

      const { POST } = await import("@/app/api/calendar/webhook/route");
      const response = await POST(
        buildWebhookRequest({
          "x-goog-channel-token": VALID_TOKEN,
          "x-goog-resource-state": "unknown_state",
          "x-goog-channel-id": "channel-1",
          "x-goog-resource-id": "resource-1",
        })
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.action).toBe("ignored");
    });
  });

  describe("user resolution via channel lookup", () => {
    it("should resolve user from googleChannelId on CalendarConnection", async () => {
      mockNoSession(); // No session fallback
      (prisma.calendarConnection.findFirst as jest.Mock).mockResolvedValue({
        userId: "resolved-user-99",
      });

      const { POST } = await import("@/app/api/calendar/webhook/route");
      const response = await POST(
        buildWebhookRequest({
          "x-goog-channel-token": VALID_TOKEN,
          "x-goog-resource-state": "sync",
          "x-goog-channel-id": "known-channel-abc",
          "x-goog-resource-id": "known-resource",
        })
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.action).toBe("acknowledged");
    });
  });
});

// ─── Sync Route Tests ──────────────────────────────────────────

describe("Sync — POST /api/calendar/sync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 when unauthenticated", async () => {
    mockNoSession();

    const { POST } = await import("@/app/api/calendar/sync/route");
    const response = await POST();

    expect(response.status).toBe(401);
  });

  it("should trigger catchUpSync and return SyncResult", async () => {
    mockSession("user-1");
    mockCalendarService.catchUpSync.mockResolvedValue({
      success: true,
      action: "update",
      googleEventId: "event-1",
    });

    const { POST } = await import("@/app/api/calendar/sync/route");
    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.action).toBe("update");
    expect(mockCalendarService.catchUpSync).toHaveBeenCalledWith("user-1");
  });
});

describe("Sync — GET /api/calendar/sync (health)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return { connected: false } when no connection", async () => {
    mockSession("user-1");
    mockCalendarRepo.findByUserId.mockResolvedValue(null);

    const { GET } = await import("@/app/api/calendar/sync/route");
    const response = await GET();
    const body = await response.json();

    expect(body.connected).toBe(false);
    expect(body.lastSync).toBeNull();
  });

  it("should return connection info when active", async () => {
    mockSession("user-1");
    mockCalendarRepo.findByUserId.mockResolvedValue({
      id: "conn-1",
      userId: "user-1",
      status: "ACTIVE",
      googleEmail: "dentist@test.com",
      lastSyncedAt: new Date("2026-06-15T14:30:00Z"),
    });

    const { GET } = await import("@/app/api/calendar/sync/route");
    const response = await GET();
    const body = await response.json();

    expect(body.connected).toBe(true);
    expect(body.lastSync).toBeDefined();
    expect(body.calendarEmail).toBe("dentist@test.com");
  });
});
