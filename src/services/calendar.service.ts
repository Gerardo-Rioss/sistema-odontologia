import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import type { Appointment } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calendarRepository } from "@/repositories/calendar.repository";
import { appointmentRepository } from "@/repositories/appointment.repository";
import type { SyncResult, GoogleCalendarEvent } from "@/types/calendar";

// ─── Constants ─────────────────────────────────────────────────

/** Default timezone for Google Calendar events (Argentina). */
const DEFAULT_TIMEZONE = "America/Argentina/Buenos_Aires";
/** Default event duration in minutes. */
const DEFAULT_DURATION_MINUTES = 60;

// ─── CalendarService ──────────────────────────────────────────

/**
 * Handles bidirectional sync between the local appointment system
 * and Google Calendar via OAuth2.
 *
 * All sync operations follow a fire-and-forget pattern:
 * they catch errors internally, log them, and return a SyncResult.
 * Failures do NOT throw and do NOT block the caller.
 */
export class CalendarService {
  // ─── OAuth2 Client Factory ──────────────────────────────────

  /**
   * Creates a Google OAuth2Client for the given user with
   * automatic token refresh. Reads encrypted tokens from the
   * database, decrypts them, and configures the client.
   *
   * Returns `null` if the user has no active calendar connection
   * or if required environment variables are missing.
   */
  private async getOAuth2Client(
    userId: string
  ): Promise<OAuth2Client | null> {
    try {
      const connection = await calendarRepository.findByUserId(userId);
      if (!connection || connection.status !== "ACTIVE") return null;

      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const redirectUri = process.env.GOOGLE_REDIRECT_URI;

      if (!clientId || !clientSecret || !redirectUri) {
        console.error(
          "[CalendarService] Missing Google OAuth environment variables (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI)"
        );
        return null;
      }

      const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
      );

      oauth2Client.setCredentials({
        access_token: connection.accessToken,
        refresh_token: connection.refreshToken,
        expiry_date: connection.tokenExpiry.getTime(),
      });

      // Auto-persist refreshed tokens back to the database.
      // The google-auth-library fires 'tokens' whenever it
      // successfully refreshes the access token.
      oauth2Client.on("tokens", async (tokens) => {
        try {
          if (tokens.access_token || tokens.refresh_token) {
            await calendarRepository.upsertTokens(userId, {
              accessToken:
                tokens.access_token ?? connection.accessToken,
              refreshToken:
                tokens.refresh_token ?? connection.refreshToken,
              tokenExpiry: tokens.expiry_date
                ? new Date(tokens.expiry_date)
                : new Date(Date.now() + 3_600_000),
              googleEmail: connection.googleEmail,
              googleCalendarId: connection.googleCalendarId,
            });
          }
        } catch (err) {
          console.error(
            "[CalendarService] Failed to persist refreshed tokens:",
            err
          );
        }
      });

      return oauth2Client;
    } catch (err) {
      console.error("[CalendarService] getOAuth2Client error:", err);
      return null;
    }
  }

  // ─── Event Builder ──────────────────────────────────────────

  /**
   * Transforms a local Appointment into a Google Calendar event
   * resource object. Combines `appointment.date` + `appointment.time`
   * into full ISO datetime strings for start/end.
   *
   * The event title follows the pattern: `<TYPE> — <PATIENT_NAME>`.
   */
  private createGoogleEvent(
    appointment: Appointment & {
      patient?: { id: string; name: string };
    },
    attendeeEmail?: string | null
  ): Record<string, unknown> {
    const patientName = appointment.patient?.name ?? "Paciente";

    // Combine date (Date object) with time string (HH:mm)
    const [hours, minutes] = appointment.time.split(":").map(Number);
    const startDate = new Date(appointment.date);
    startDate.setHours(hours, minutes, 0, 0);

    const endDate = new Date(
      startDate.getTime() + DEFAULT_DURATION_MINUTES * 60 * 1000
    );

    const event: Record<string, unknown> = {
      summary: `${appointment.type} — ${patientName}`,
      start: {
        dateTime: startDate.toISOString(),
        timeZone: DEFAULT_TIMEZONE,
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: DEFAULT_TIMEZONE,
      },
    };

    if (appointment.notes) {
      event.description = appointment.notes;
    }

    if (attendeeEmail) {
      event.attendees = [{ email: attendeeEmail }];
    }

    return event;
  }

  // ─── Main Sync Method ───────────────────────────────────────

  /**
   * Synchronizes a single appointment to Google Calendar.
   *
   * - If the appointment already has a `googleEventId`, it updates
   *   the existing Google event.
   * - If not, it creates a new Google event and saves the event ID
   *   back to the local appointment.
   * - If the Google event was deleted externally (HTTP 410), it
   *   resets the `googleEventId` and re-creates the event.
   *
   * This method NEVER throws — it catches all errors, logs them,
   * and returns a SyncResult.
   *
   * @returns SyncResult describing the outcome.
   */
  async syncToCalendar(
    appointmentId: string,
    userId: string
  ): Promise<SyncResult> {
    try {
      // 1. Fetch appointment with patient name
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: { patient: { select: { id: true, name: true } } },
      });

      if (!appointment) {
        return this.result(
          "none",
          appointmentId,
          undefined,
          "Appointment not found"
        );
      }

      // 2. Check calendar connection
      const connection = await calendarRepository.findByUserId(userId);
      if (!connection || connection.status !== "ACTIVE") {
        return this.result("none", appointmentId);
      }

      // 3. Get authenticated OAuth2 client
      const oauth2Client = await this.getOAuth2Client(userId);
      if (!oauth2Client) {
        return this.result(
          "none",
          appointmentId,
          undefined,
          "Could not create OAuth2 client"
        );
      }

      const calendar = google.calendar({ version: "v3", auth: oauth2Client });
      const calendarId = connection.googleCalendarId;
      const calendarEmail = connection.googleEmail;

      // 4. Build the Google event payload
      const eventBody = this.createGoogleEvent(appointment, calendarEmail);

      // 5. Update existing or create new
      if (appointment.googleEventId) {
        try {
          const response = await calendar.events.update({
            calendarId,
            eventId: appointment.googleEventId,
            requestBody: eventBody,
          });

          return this.result(
            "update",
            appointmentId,
            response.data.id ?? appointment.googleEventId
          );
        } catch (err: unknown) {
          const gErr = err as { code?: number; message?: string };

          if (gErr.code === 410) {
            // Event was deleted externally — reset and re-create
            console.warn(
              `[CalendarService] Google event ${appointment.googleEventId} gone (410). Re-creating.`
            );

            await appointmentRepository.update(appointmentId, {
              googleEventId: null,
            });

            const createResponse = await calendar.events.insert({
              calendarId,
              requestBody: eventBody,
            });

            if (createResponse.data.id) {
              await appointmentRepository.update(appointmentId, {
                googleEventId: createResponse.data.id,
                googleCalendarId: calendarId,
              });
            }

            return this.result(
              "create",
              appointmentId,
              createResponse.data.id ?? undefined
            );
          }

          throw err; // re-throw to outer catch
        }
      } else {
        // Create new Google event
        const response = await calendar.events.insert({
          calendarId,
          requestBody: eventBody,
        });

        if (response.data.id) {
          await appointmentRepository.update(appointmentId, {
            googleEventId: response.data.id,
            googleCalendarId: calendarId,
          });
        }

        return this.result(
          "create",
          appointmentId,
          response.data.id ?? undefined
        );
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);
      console.error(
        `[CalendarService] syncToCalendar failed for appointment ${appointmentId}:`,
        message
      );
      return this.result("none", appointmentId, undefined, message);
    }
  }

  // ─── Delete from Calendar ───────────────────────────────────

  /**
   * Deletes an event from Google Calendar.
   *
   * Handles HTTP 410 (already deleted) gracefully — treats it as
   * a successful delete.
   *
   * @param googleEventId   The Google Calendar event ID to delete.
   * @param googleCalendarId The calendar ID (usually "primary").
   * @param userId           The local user ID (for OAuth client).
   */
  async deleteFromCalendar(
    googleEventId: string,
    googleCalendarId: string,
    userId: string
  ): Promise<SyncResult> {
    try {
      const oauth2Client = await this.getOAuth2Client(userId);
      if (!oauth2Client) {
        return this.result(
          "none",
          undefined,
          googleEventId,
          "No active calendar connection"
        );
      }

      const calendar = google.calendar({ version: "v3", auth: oauth2Client });

      try {
        await calendar.events.delete({
          calendarId: googleCalendarId,
          eventId: googleEventId,
        });
      } catch (err: unknown) {
        const gErr = err as { code?: number; message?: string };
        if (gErr.code === 410) {
          // Already deleted on Google side — that's fine
          return this.result("delete", undefined, googleEventId);
        }
        throw err;
      }

      return this.result("delete", undefined, googleEventId);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);
      console.error(
        `[CalendarService] deleteFromCalendar failed for event ${googleEventId}:`,
        message
      );
      return this.result("none", undefined, googleEventId, message);
    }
  }

  // ─── Webhook Reconciliation (LWW) ───────────────────────────

  /**
   * Processes an incoming webhook event from Google Calendar.
   *
   * Implements Last-Write-Wins (LWW) conflict resolution:
   * - Compares `googleEvent.updated` with `localAppointment.updatedAt`.
   * - If Google is newer → pulls changes into the local appointment.
   * - If local is newer → pushes local changes back to Google.
   * - If equal → no action.
   *
   * @param googleEvent The event data received from Google's push notification.
   * @param userId      The local user ID that owns the calendar connection.
   */
  async reconcileWebhookEvent(
    googleEvent: GoogleCalendarEvent,
    userId: string
  ): Promise<SyncResult> {
    try {
      // 1. Find local appointment by googleEventId
      const appointment = await prisma.appointment.findUnique({
        where: { googleEventId: googleEvent.id },
      });

      if (!appointment) {
        return this.result(
          "none",
          undefined,
          googleEvent.id,
          "No local appointment matches this Google event"
        );
      }

      // 2. LWW: compare timestamps
      const googleUpdated = new Date(googleEvent.updated);
      const localUpdated = appointment.updatedAt;

      if (googleUpdated.getTime() === localUpdated.getTime()) {
        // Equal timestamps — no action needed
        return this.result(
          "conflict_resolved",
          appointment.id,
          googleEvent.id
        );
      }

      if (googleUpdated > localUpdated) {
        // Google is newer → pull to local
        const startDate = new Date(googleEvent.start.dateTime);
        const hours = String(startDate.getHours()).padStart(2, "0");
        const minutes = String(startDate.getMinutes()).padStart(2, "0");
        const time = `${hours}:${minutes}`;

        await appointmentRepository.update(appointment.id, {
          date: startDate,
          time,
          notes: googleEvent.description ?? null,
        });

        return this.result(
          "conflict_resolved",
          appointment.id,
          googleEvent.id
        );
      } else {
        // Local is newer → push to Google
        // Fire-and-forget: don't await, attach catch handler
        this.syncToCalendar(appointment.id, userId).catch((err) =>
          console.error(
            "[CalendarService] reconcileWebhookEvent push-back failed:",
            err
          )
        );

        return this.result(
          "conflict_resolved",
          appointment.id,
          googleEvent.id
        );
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);
      console.error(
        "[CalendarService] reconcileWebhookEvent failed:",
        message
      );
      return this.result("none", undefined, googleEvent.id, message);
    }
  }

  // ─── Catch-Up Sync ──────────────────────────────────────────

  /**
   * Scheduled fallback sync: compares all local appointments
   * against Google Calendar events updated since `lastSyncedAt`.
   *
   * - Pulls Google events updated after the last known sync.
   * - Pushes any local appointments that lack a `googleEventId`.
   * - Updates `lastSyncedAt` upon completion.
   *
   * @param userId The local user ID.
   */
  async catchUpSync(userId: string): Promise<SyncResult> {
    try {
      const connection = await calendarRepository.findByUserId(userId);
      if (!connection || connection.status !== "ACTIVE") {
        return this.result(
          "none",
          undefined,
          undefined,
          "No active calendar connection"
        );
      }

      const oauth2Client = await this.getOAuth2Client(userId);
      if (!oauth2Client) {
        return this.result(
          "none",
          undefined,
          undefined,
          "Could not create OAuth2 client"
        );
      }

      const calendar = google.calendar({ version: "v3", auth: oauth2Client });
      const lastSync = connection.lastSyncedAt ?? new Date(0);

      // 1. Fetch Google events updated since last sync
      const googleResponse = await calendar.events.list({
        calendarId: connection.googleCalendarId,
        updatedMin: lastSync.toISOString(),
        singleEvents: true,
        orderBy: "updated",
      });

      const googleEvents = googleResponse.data.items ?? [];

      // 2. Reconcile each Google event
      for (const event of googleEvents) {
        if (!event.id) continue;

        const gEvent: GoogleCalendarEvent = {
          id: event.id,
          summary: event.summary ?? "",
          description: event.description ?? undefined,
          start: event.start as GoogleCalendarEvent["start"],
          end: event.end as GoogleCalendarEvent["end"],
          status: event.status ?? "",
          updated: event.updated ?? new Date().toISOString(),
        };

        await this.reconcileWebhookEvent(gEvent, userId);
      }

      // 3. Push local appointments without googleEventId
      const appointments = await appointmentRepository.findByDentist(
        userId
      );

      for (const appt of appointments) {
        if (!appt.googleEventId) {
          await this.syncToCalendar(appt.id, userId);
        }
      }

      // 4. Update lastSyncedAt
      await calendarRepository.updateLastSyncedAt(userId);

      return this.result("update");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);
      console.error("[CalendarService] catchUpSync failed:", message);
      return this.result("none", undefined, undefined, message);
    }
  }

  // ─── Result Helper ──────────────────────────────────────────

  /**
   * Convenience factory for building SyncResult objects.
   */
  private result(
    action: SyncResult["action"],
    localAppointmentId?: string,
    googleEventId?: string,
    error?: string
  ): SyncResult {
    return {
      success: !error,
      action,
      googleEventId,
      localAppointmentId,
      error,
    };
  }
}

/** Singleton instance of the calendar sync service. */
export const calendarService = new CalendarService();
