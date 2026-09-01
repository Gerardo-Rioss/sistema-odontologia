import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { patientService } from "@/services/patient.service";
import { CreatePatientDTO } from "@/lib/validations";

/**
 * Gestión de pacientes odontológicos.
 * GET  /api/patients — listar pacientes del dentista autenticado.
 * POST /api/patients — crear un nuevo paciente.
 */

export const GET = withAuth(async (request, { session }) => {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || undefined;

  const patients = await patientService.getAll(session.user.id, search);

  return NextResponse.json({ success: true, data: patients });
});

export const POST = withAuth(async (request, { session }) => {
  const body = await request.json();

  const parsed = CreatePatientDTO.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Datos inválidos",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const patient = await patientService.create(
    parsed.data,
    session.user.id
  );

  return NextResponse.json(
    { success: true, data: patient },
    { status: 201 }
  );
});
