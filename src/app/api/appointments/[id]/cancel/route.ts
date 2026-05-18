import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { appointmentService } from "@/services/appointment.service";
import { calendarService } from "@/services/calendar.service";

/**
 * Cancelar una cita (PENDING | CONFIRMED → CANCELLED).
 * PATCH /api/appointments/[id]/cancel
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const appointment = await appointmentService.cancel(
      params.id,
      session.user.id
    );

    // Fire-and-forget: sync cancelled appointment to Google Calendar
    calendarService
      .syncToCalendar(appointment.id, session.user.id)
      .catch((err) =>
        console.error(
          `[Appointments] Calendar sync failed for ${appointment.id}:`,
          err
        )
      );

    return NextResponse.json({ success: true, data: appointment });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Cita no encontrada") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message.includes("No tiene permiso")) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      if (error.message.includes("La cita ya está cancelada")) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
    }

    console.error("PATCH /api/appointments/[id]/cancel error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
