import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { appointmentService } from "@/services/appointment.service";
import { UpdateAppointmentDTO } from "@/lib/validations";
import { ZodError } from "zod";

/**
 * Cita individual por ID.
 * GET    /api/appointments/[id] — obtener cita.
 * PUT    /api/appointments/[id] — actualizar cita (reprogramar).
 * DELETE /api/appointments/[id] — eliminar cita.
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const appointment = await appointmentService.getById(
      params.id,
      session.user.id
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
    }

    console.error("GET /api/appointments/[id] error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();

    const parsed = UpdateAppointmentDTO.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const appointment = await appointmentService.reschedule(
      params.id,
      parsed.data,
      session.user.id
    );

    return NextResponse.json({ success: true, data: appointment });
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
      if (error.message === "Cita no encontrada") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message.includes("No tiene permiso")) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      if (error.message.includes("Conflicto de horario")) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
    }

    console.error("PUT /api/appointments/[id] error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await appointmentService.delete(params.id, session.user.id);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Cita no encontrada") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message.includes("No tiene permiso")) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }

    console.error("DELETE /api/appointments/[id] error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
