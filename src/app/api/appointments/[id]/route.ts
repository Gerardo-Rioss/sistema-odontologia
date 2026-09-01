import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { appointmentService } from "@/services/appointment.service";
import { UpdateAppointmentDTO } from "@/lib/validations";

/**
 * Cita individual por ID.
 * GET    /api/appointments/[id] — obtener cita.
 * PUT    /api/appointments/[id] — actualizar cita (reprogramar).
 * DELETE /api/appointments/[id] — eliminar cita.
 */

export const GET = withAuth(async (request, { session, params }) => {
  const appointment = await appointmentService.getById(
    params.id,
    session.user.id
  );

  return NextResponse.json({ success: true, data: appointment });
});

export const PUT = withAuth(async (request, { session, params }) => {
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
});

export const DELETE = withAuth(async (request, { session, params }) => {
  await appointmentService.delete(params.id, session.user.id);

  return new NextResponse(null, { status: 204 });
});
