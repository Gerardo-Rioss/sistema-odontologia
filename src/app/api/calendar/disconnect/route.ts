import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { calendarRepository } from "@/repositories/calendar.repository";

/**
 * Disconnects the user's Google Calendar integration.
 *
 * POST /api/calendar/disconnect
 * - Verifies the user is authenticated.
 * - Deletes the CalendarConnection from the database.
 * - Returns 200 on success (even if no connection existed — idempotent).
 */
export const POST = withAuth(async (request, { session }) => {
  const connection = await calendarRepository.findByUserId(session.user.id);
  if (connection) {
    await calendarRepository.delete(connection.id);
  }

  return NextResponse.json({ success: true });
});
