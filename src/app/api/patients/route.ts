import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { patientService } from "@/services/patient.service";
import { CreatePatientDTO } from "@/lib/validations";
import { ZodError } from "zod";

/**
 * Gestión de pacientes odontológicos.
 * GET  /api/patients — listar pacientes del dentista autenticado.
 * POST /api/patients — crear un nuevo paciente.
 */

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;

    const patients = await patientService.getAll(session.user.id, search);

    return NextResponse.json({ success: true, data: patients });
  } catch (error) {
    console.error("GET /api/patients error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

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
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          details: error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    console.error("POST /api/patients error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
