import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { appointmentService } from "@/services/appointment.service";

/**
 * Cancelar una cita (PENDING | CONFIRMED → CANCELLED).
 * PATCH /api/appointments/[id]/cancel
 */
export const PATCH = withAuth(async (request, { session, params }) => {
  const appointment = await appointmentService.cancel(
    params.id,
    session.user.id
  );

  return NextResponse.json({ success: true, data: appointment });
});
