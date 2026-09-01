import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { appointmentService } from "@/services/appointment.service";

/**
 * Confirmar una cita (PENDING → CONFIRMED).
 * PATCH /api/appointments/[id]/confirm
 */
export const PATCH = withAuth(async (request, { session, params }) => {
  const appointment = await appointmentService.confirm(
    params.id,
    session.user.id
  );

  return NextResponse.json({ success: true, data: appointment });
});
