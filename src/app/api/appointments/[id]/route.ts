import { NextResponse } from "next/server";

/**
 * Cita individual por ID.
 * GET /api/appointments/[id] — obtener cita.
 * PATCH /api/appointments/[id] — actualizar cita.
 * DELETE /api/appointments/[id] — eliminar cita.
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  return NextResponse.json({
    message: `Cita ${params.id} — próximamente`,
  });
}

export async function PATCH(
  _request: Request,
  { params }: { params: { id: string } }
) {
  return NextResponse.json({
    message: `Actualizar cita ${params.id} — próximamente`,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  return NextResponse.json({
    message: `Eliminar cita ${params.id} — próximamente`,
  });
}
