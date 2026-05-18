import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { patientService } from "@/services/patient.service";
import { UpdatePatientDTO } from "@/lib/validations";
import { ZodError } from "zod";

/**
 * Paciente individual por ID.
 * GET    /api/patients/[id] — obtener paciente con historial de citas.
 * PUT    /api/patients/[id] — actualizar datos del paciente.
 * DELETE /api/patients/[id] — eliminar paciente (cascada de citas).
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const patient = await patientService.getById(params.id, session.user.id);

    return NextResponse.json({ success: true, data: patient });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Paciente no encontrado") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message.includes("No tiene permiso")) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }

    console.error("GET /api/patients/[id] error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

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

    if (error instanceof Error) {
      if (error.message === "Paciente no encontrado") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message.includes("No tiene permiso")) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }

    console.error("PUT /api/patients/[id] error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await patientService.delete(params.id, session.user.id);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Paciente no encontrado") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message.includes("No tiene permiso")) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }

    console.error("DELETE /api/patients/[id] error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
