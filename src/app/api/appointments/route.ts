import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { appointmentService } from "@/services/appointment.service";
import { CreateAppointmentDTO } from "@/lib/validations";

/**
 * Gestión de citas odontológicas.
 * GET  /api/appointments — listar citas del dentista autenticado.
 * POST /api/appointments — crear una nueva cita.
 */

export const GET = withAuth(async (request, { session }) => {
  const { searchParams } = new URL(request.url);
  const filters: { status?: string; date?: string; search?: string } = {};

  const status = searchParams.get("status");
  const date = searchParams.get("date");
  const search = searchParams.get("search");

  if (status) filters.status = status;
  if (date) filters.date = date;
  if (search) filters.search = search;

  const appointments = await appointmentService.getAll(
    session.user.id,
    filters
  );

  return NextResponse.json({ success: true, data: appointments });
});

export const POST = withAuth(async (request, { session }) => {
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

  return NextResponse.json(
    { success: true, data: appointment },
    { status: 201 }
  );
});
