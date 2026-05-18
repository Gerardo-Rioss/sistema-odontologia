import { NextResponse } from "next/server";

/**
 * Paciente individual por ID.
 * GET /api/patients/[id] — obtener paciente.
 * PATCH /api/patients/[id] — actualizar paciente.
 * DELETE /api/patients/[id] — eliminar paciente.
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  return NextResponse.json({
    message: `Paciente ${params.id} — próximamente`,
  });
}

export async function PATCH(
  _request: Request,
  { params }: { params: { id: string } }
) {
  return NextResponse.json({
    message: `Actualizar paciente ${params.id} — próximamente`,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  return NextResponse.json({
    message: `Eliminar paciente ${params.id} — próximamente`,
  });
}
