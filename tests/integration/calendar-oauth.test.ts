/**
 * Integration tests for the Google Calendar OAuth callback flow.
 *
 * Tests the token exchange, encryption, upsert, and redirect flows
 * of the GET /api/calendar/auth/callback endpoint.
 *
 * NOTE: These tests mock the Google token endpoint since we cannot
 * make real HTTP calls in a test environment. Full E2E coverage
 * requires a running Google OAuth playground or real credentials.
 */

// ─── Mocks ────────────────────────────────────────────────────

// Mock NextAuth session
jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

// Mock the calendar repository
const mockCalendarRepo = {
  findByUserId: jest.fn(),
  upsertTokens: jest.fn(),
  delete: jest.fn(),
  updateLastSyncedAt: jest.fn(),
  updateStatus: jest.fn(),
};

jest.mock("@/repositories/calendar.repository", () => ({
  calendarRepository: mockCalendarRepo,
}));

// Mock googleapis
const mockGetToken = jest.fn();
const mockGetTokenInfo = jest.fn();

jest.mock("googleapis", () => {
  const mockOAuth2 = jest.fn(() => ({
    getToken: mockGetToken,
    getTokenInfo: mockGetTokenInfo,
    setCredentials: jest.fn(),
    on: jest.fn(),
    generateAuthUrl: jest.fn(),
  }));

  return {
    google: {
      auth: {
        OAuth2: mockOAuth2,
      },
      calendar: jest.fn(),
    },
  };
});

// ─── Helpers ───────────────────────────────────────────────────

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

function mockSession(userId = "user-1") {
  (auth as jest.Mock).mockResolvedValue({
    user: { id: userId, email: "dentist@test.com", role: "DENTIST" },
  });
}

function mockNoSession() {
  (auth as jest.Mock).mockResolvedValue(null);
}

function buildCallbackUrl(params: Record<string, string>): string {
  const url = new URL("http://localhost:3000/api/calendar/auth/callback");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return url.toString();
}

// ─── Dynamic import for route handler ─────────────────────────

// We import the route handler lazily after mocks are set up
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let callbackHandler: any;

beforeAll(async () => {
  const mod = await import(
    "@/app/api/calendar/auth/callback/route"
  );
  callbackHandler = mod;
});

// ─── Tests ────────────────────────────────────────────────────

describe("OAuth Callback — GET /api/calendar/auth/callback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = "test-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
    process.env.GOOGLE_REDIRECT_URI =
      "http://localhost:3000/api/calendar/auth/callback";
  });

  describe("authentication", () => {
    it("should redirect to /login when no session exists", async () => {
      mockNoSession();

      const url = buildCallbackUrl({
        code: "auth-code-123",
        state: "random-state-token",
      });

      const response = await callbackHandler.GET(
        new NextRequest(url)
      );

      expect(response.status).toBe(307); // redirect
      const location = response.headers.get("location");
      expect(location).toContain("/login");
    });
  });

  describe("error handling", () => {
    it("should redirect to settings?calendar=denied when Google returns error", async () => {
      mockSession();

      const url = buildCallbackUrl({
        error: "access_denied",
      });

      const response = await callbackHandler.GET(
        new NextRequest(url)
      );

      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      expect(location).toContain("calendar=denied");
    });

    it("should redirect to settings?calendar=error when code is missing", async () => {
      mockSession();

      const url = buildCallbackUrl({
        state: "random-state",
        // no code
      });

      const response = await callbackHandler.GET(
        new NextRequest(url)
      );

      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      expect(location).toContain("calendar=error");
    });

    it("should redirect to settings?calendar=error when state is missing (CSRF)", async () => {
      mockSession();

      const url = buildCallbackUrl({
        code: "auth-code-123",
        // no state
      });

      const response = await callbackHandler.GET(
        new NextRequest(url)
      );

      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      expect(location).toContain("calendar=error");
    });
  });

  describe("happy path — token exchange and storage", () => {
    it("should exchange code for tokens and redirect to settings on success", async () => {
      mockSession("user-1");

      // Mock successful token exchange
      mockGetToken.mockResolvedValue({
        tokens: {
          access_token: "ya29.test-access-token",
          refresh_token: "1//test-refresh-token",
          expires_in: 3599,
          expiry_date: Date.now() + 3599000,
          scope:
            "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly",
          token_type: "Bearer",
        },
      });

      // Mock token info for email resolution
      mockGetTokenInfo.mockResolvedValue({
        email: "dentist@odontologia.com",
        scope: "calendar.events calendar.readonly",
      });

      // Mock successful upsert
      mockCalendarRepo.upsertTokens.mockResolvedValue({
        id: "conn-1",
        userId: "user-1",
        status: "ACTIVE",
        googleEmail: "dentist@odontologia.com",
        googleCalendarId: "primary",
      });

      const url = buildCallbackUrl({
        code: "valid-auth-code-xyz",
        state: "base64-encoded-state-token==",
      });

      const response = await callbackHandler.GET(
        new NextRequest(url)
      );

      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      expect(location).toContain("calendar=connected");

      // Verify upsertTokens was called with correct data
      expect(mockCalendarRepo.upsertTokens).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({
          accessToken: "ya29.test-access-token",
          refreshToken: "1//test-refresh-token",
          googleEmail: "dentist@odontologia.com",
          googleCalendarId: "primary",
        })
      );
    });
  });

  describe("refresh token edge cases", () => {
    it("should fail gracefully when no refresh token is returned", async () => {
      mockSession("user-2");

      // Google only returns refresh_token on first authorization with prompt=consent
      mockGetToken.mockResolvedValue({
        tokens: {
          access_token: "ya29.access-no-refresh",
          expires_in: 3599,
          expiry_date: Date.now() + 3599000,
          scope: "calendar.events calendar.readonly",
          token_type: "Bearer",
          // no refresh_token
        },
      });

      mockGetTokenInfo.mockResolvedValue({
        email: "dentist@test.com",
        scope: "calendar.events",
      });

      const url = buildCallbackUrl({
        code: "code-no-refresh",
        state: "state-token",
      });

      const response = await callbackHandler.GET(
        new NextRequest(url)
      );

      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      expect(location).toContain("calendar=error");

      // Should NOT have upserted without refresh token
      expect(mockCalendarRepo.upsertTokens).not.toHaveBeenCalled();
    });
  });
});

// ─── OAuth Auth Route Tests ───────────────────────────────────

describe("OAuth Auth — GET /api/calendar/auth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = "test-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
    process.env.GOOGLE_REDIRECT_URI =
      "http://localhost:3000/api/calendar/auth/callback";
  });

  it("should return 401 when unauthenticated", async () => {
    mockNoSession();

    const { GET } = await import("@/app/api/calendar/auth/route");
    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("should redirect to Google OAuth consent screen when authenticated", async () => {
    mockSession("user-1");

    const { GET } = await import("@/app/api/calendar/auth/route");
    const response = await GET();

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("https://accounts.google.com/o/oauth2/v2/auth");
    expect(location).toContain("scope=");
    expect(location).toContain("calendar.events");
    expect(location).toContain("calendar.readonly");
    expect(location).toContain("access_type=offline");
    expect(location).toContain("prompt=consent");
    expect(location).toContain("state=");
  });

  it("should return 500 when Google OAuth env vars are missing", async () => {
    mockSession("user-1");

    // Temporarily remove env vars
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_REDIRECT_URI;

    const { GET } = await import("@/app/api/calendar/auth/route");
    const response = await GET();

    expect(response.status).toBe(500);
  });
});

// ─── Disconnect Route Tests ────────────────────────────────────

describe("Disconnect — POST /api/calendar/disconnect", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 when unauthenticated", async () => {
    mockNoSession();

    const { POST } = await import("@/app/api/calendar/disconnect/route");
    const response = await POST(new NextRequest("http://localhost:3000/api/calendar/disconnect", { method: "POST" }));

    expect(response.status).toBe(401);
  });

  it("should delete connection and return success when authenticated", async () => {
    mockSession("user-1");
    mockCalendarRepo.findByUserId.mockResolvedValue({
      id: "conn-1",
      userId: "user-1",
      status: "ACTIVE",
    });
    mockCalendarRepo.delete.mockResolvedValue(undefined);

    const { POST } = await import("@/app/api/calendar/disconnect/route");
    const response = await POST(new NextRequest("http://localhost:3000/api/calendar/disconnect", { method: "POST" }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(mockCalendarRepo.delete).toHaveBeenCalledWith("conn-1");
  });

  it("should succeed idempotently when no connection exists", async () => {
    mockSession("user-1");
    mockCalendarRepo.findByUserId.mockResolvedValue(null);

    const { POST } = await import("@/app/api/calendar/disconnect/route");
    const response = await POST(new NextRequest("http://localhost:3000/api/calendar/disconnect", { method: "POST" }));

    expect(response.status).toBe(200);
    expect(mockCalendarRepo.delete).not.toHaveBeenCalled();
  });
});

// ─── Status Route Tests ────────────────────────────────────────

describe("Status — GET /api/calendar/status", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return { connected: false } when no connection exists", async () => {
    mockSession("user-1");
    mockCalendarRepo.findByUserId.mockResolvedValue(null);

    const { GET } = await import("@/app/api/calendar/status/route");
    const response = await GET();
    const body = await response.json();

    expect(body.connected).toBe(false);
  });

  it("should return connected=true with email when ACTIVE connection exists", async () => {
    mockSession("user-1");
    mockCalendarRepo.findByUserId.mockResolvedValue({
      id: "conn-1",
      userId: "user-1",
      status: "ACTIVE",
      googleEmail: "dentist@test.com",
      lastSyncedAt: new Date("2026-06-15T14:00:00Z"),
    });

    const { GET } = await import("@/app/api/calendar/status/route");
    const response = await GET();
    const body = await response.json();

    expect(body.connected).toBe(true);
    expect(body.email).toBe("dentist@test.com");
    expect(body.lastSyncedAt).toBeDefined();
  });

  it("should return { connected: false } when connection is REVOKED", async () => {
    mockSession("user-1");
    mockCalendarRepo.findByUserId.mockResolvedValue({
      id: "conn-1",
      userId: "user-1",
      status: "REVOKED",
      googleEmail: "old@test.com",
      lastSyncedAt: null,
    });

    const { GET } = await import("@/app/api/calendar/status/route");
    const response = await GET();
    const body = await response.json();

    expect(body.connected).toBe(false);
  });
});
