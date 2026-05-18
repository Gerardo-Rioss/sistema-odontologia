// ─── Google Calendar Connection ────────────────────────────

export type CalendarConnectionStatus = "ACTIVE" | "REVOKED" | "EXPIRED";

/**
 * Represents a stored OAuth2 connection to Google Calendar.
 * Tokens are encrypted at rest in the database.
 */
export interface CalendarConnection {
  id: string;
  userId: string;
  accessToken: string; // decrypted at read time
  refreshToken: string; // decrypted at read time
  tokenExpiry: Date;
  googleCalendarId: string;
  googleEmail: string | null;
  status: CalendarConnectionStatus;
  googleChannelId: string | null;
  googleResourceId: string | null;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── OAuth ─────────────────────────────────────────────────

/** Response from Google's OAuth2 token endpoint. */
export interface OAuthTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string; // only on first authorization
  scope: string;
  token_type: string;
}

// ─── Google Calendar Event ─────────────────────────────────

/** Mirrors a Google Calendar event relevant fields. */
export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  status: string;
  updated: string; // ISO 8601
}

// ─── Sync Result ───────────────────────────────────────────

/** Outcome of a single bidirectional sync operation. */
export interface SyncResult {
  success: boolean;
  action: "create" | "update" | "delete" | "none" | "conflict_resolved";
  googleEventId?: string;
  localAppointmentId?: string;
  error?: string;
}
