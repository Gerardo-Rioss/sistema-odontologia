import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { attachmentService } from "@/services/attachment.service";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const attachments = await attachmentService.getByPatient(params.id, session.user.id);
    return NextResponse.json({ success: true, data: attachments });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Paciente no encontrado") return NextResponse.json({ error: error.message }, { status: 404 });
      if (error.message.includes("No tiene permiso")) return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("GET /api/patients/[id]/attachments error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const attachment = await attachmentService.upload(
      params.id,
      session.user.id,
      { name: file.name, type: file.type, size: file.size, buffer },
      formData.get("category") as string || undefined,
      formData.get("notes") as string || undefined,
    );
    return NextResponse.json({ success: true, data: attachment }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Paciente no encontrado") return NextResponse.json({ error: error.message }, { status: 404 });
      if (error.message.includes("No tiene permiso")) return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("POST /api/patients/[id]/attachments error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
