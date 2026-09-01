import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { statisticsService } from "@/services/statistics.service";

/**
 * Estadísticas generales del consultorio.
 * GET /api/statistics/overview — resumen de métricas clave.
 */
export const GET = withAuth(async (_request, { session }) => {
  try {
    const data = await statisticsService.getOverview(session.user.id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[Statistics] Error computing overview:", error);
    return NextResponse.json(
      { error: "Error al calcular estadísticas" },
      { status: 500 }
    );
  }
});
