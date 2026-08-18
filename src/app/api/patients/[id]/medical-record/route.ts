import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { medicalRecordService } from "@/services/medical-record.service";
import { UpdateMedicalRecordDTO } from "@/lib/validations";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const record = await medicalRecordService.getByPatient(params.id, session.user.id);
    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Paciente no encontrado") return NextResponse.json({ error: error.message }, { status: 404 });
      if (error.message.includes("No tiene permiso")) return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("GET /api/patients/[id]/medical-record error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const body = await request.json();
    const parsed = UpdateMedicalRecordDTO.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    const record = await medicalRecordService.upsert(params.id, parsed.data, session.user.id);
    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Paciente no encontrado") return NextResponse.json({ error: error.message }, { status: 404 });
      if (error.message.includes("No tiene permiso")) return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("PUT /api/patients/[id]/medical-record error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
