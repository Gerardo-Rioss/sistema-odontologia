import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { appointmentService } from "@/services/appointment.service";
import { calendarService } from "@/services/calendar.service";
import { CreateAppointmentDTO } from "@/lib/validations";
import { ZodError } from "zod";

/**
 * Gestión de citas odontológicas.
 * GET  /api/appointments — listar citas del dentista autenticado.
 * POST /api/appointments — crear una nueva cita.
 */

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filters: { status?: string; date?: string } = {};

    const status = searchParams.get("status");
    const date = searchParams.get("date");

    if (status) filters.status = status;
    if (date) filters.date = date;

    const appointments = await appointmentService.getAll(
      session.user.id,
      filters
    );

    return NextResponse.json({ success: true, data: appointments });
  } catch (error) {
    console.error("GET /api/appointments error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();

    const parsed = CreateAppointmentDTO.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const appointment = await appointmentService.schedule(
      parsed.data,
      session.user.id
    );

    // Fire-and-forget: sync to Google Calendar (do not block response)
    calendarService
      .syncToCalendar(appointment.id, session.user.id)
      .catch((err) =>
        console.error(
          `[Appointments] Calendar sync failed for ${appointment.id}:`,
          err
        )
      );

    return NextResponse.json(
      { success: true, data: appointment },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          details: error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message.includes("Conflicto de horario")) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
    }

    console.error("POST /api/appointments error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
