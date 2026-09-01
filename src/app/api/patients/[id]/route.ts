import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { patientService } from "@/services/patient.service";
import { UpdatePatientDTO } from "@/lib/validations";

/**
 * Paciente individual por ID.
 * GET    /api/patients/[id] — obtener paciente con historial de citas.
 * PUT    /api/patients/[id] — actualizar datos del paciente.
 * DELETE /api/patients/[id] — eliminar paciente (cascada de citas).
 */

export const GET = withAuth(async (request, { session, params }) => {
  const patient = await patientService.getById(params.id, session.user.id);

  return NextResponse.json({ success: true, data: patient });
});

export const PUT = withAuth(async (request, { session, params }) => {
  const body = await request.json();

  const parsed = UpdatePatientDTO.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Datos inválidos",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const patient = await patientService.update(
    params.id,
    parsed.data,
    session.user.id
  );

  return NextResponse.json({ success: true, data: patient });
});

export const DELETE = withAuth(async (request, { session, params }) => {
  await patientService.delete(params.id, session.user.id);

  return new NextResponse(null, { status: 204 });
});
