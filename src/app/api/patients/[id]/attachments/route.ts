import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { attachmentService } from "@/services/attachment.service";

export const GET = withAuth(async (request, { session, params }) => {
  const attachments = await attachmentService.getByPatient(params.id, session.user.id);
  return NextResponse.json({ success: true, data: attachments });
});

export const POST = withAuth(async (request, { session, params }) => {
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
});
