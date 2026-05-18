import { NextResponse } from "next/server";

/**
 * Estadísticas generales del consultorio.
 * GET /api/statistics/overview — resumen de métricas clave.
 */
export async function GET() {
  return NextResponse.json({
    message: "Estadísticas — próximamente",
    data: {
      totalAppointments: 0,
      totalPatients: 0,
      appointmentsToday: 0,
      completionRate: 0,
    },
  });
}
