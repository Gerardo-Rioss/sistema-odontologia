import { NextResponse } from "next/server";

/**
 * Sincronización con calendario externo (Google Calendar).
 * POST /api/calendar/sync — disparar sincronización bidireccional.
 */
export async function POST() {
  return NextResponse.json({
    message: "Sincronización de calendario — próximamente",
  });
}

export async function GET() {
  return NextResponse.json({
    message: "Estado de sincronización — próximamente",
    lastSync: null,
  });
}
