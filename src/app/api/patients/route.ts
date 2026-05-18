import { NextResponse } from "next/server";

/**
 * Gestión de pacientes.
 * GET /api/patients — listar pacientes.
 * POST /api/patients — crear paciente.
 */
export async function GET() {
  return NextResponse.json({
    message: "Pacientes API — próximamente",
    data: [],
  });
}

export async function POST() {
  return NextResponse.json({
    message: "Crear paciente — próximamente",
  });
}
