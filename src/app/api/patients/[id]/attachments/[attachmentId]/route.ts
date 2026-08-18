import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { attachmentService } from "@/services/attachment.service";

export async function DELETE(request: NextRequest, { params }: { params: { id: string; attachmentId: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await attachmentService.delete(params.attachmentId, session.user.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Archivo no encontrado") return NextResponse.json({ error: error.message }, { status: 404 });
      if (error.message.includes("No tiene permiso")) return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("DELETE /api/patients/[id]/attachments/[attachmentId] error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
