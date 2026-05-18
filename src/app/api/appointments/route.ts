import { NextResponse } from "next/server";

/**
 * Gestión de citas odontológicas.
 * GET /api/appointments — listar citas.
 * POST /api/appointments — crear cita.
 */
export async function GET() {
  return NextResponse.json({
    message: "Citas API — próximamente",
    data: [],
  });
}

export async function POST() {
  return NextResponse.json({
    message: "Crear cita — próximamente",
  });
}
