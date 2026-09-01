import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { calendarRepository } from "@/repositories/calendar.repository";

/**
 * Returns the current user's Google Calendar connection status.
 *
 * GET /api/calendar/status
 * - If connected: { connected: true, email, lastSyncedAt }
 * - If not:     { connected: false }
 */
export const GET = withAuth(async (request, { session }) => {
  const connection = await calendarRepository.findByUserId(session.user.id);

  if (!connection || connection.status !== "ACTIVE") {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: true,
    email: connection.googleEmail ?? null,
    lastSyncedAt: connection.lastSyncedAt?.toISOString() ?? null,
  });
});
