import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { medicalRecordService } from "@/services/medical-record.service";
import { UpdateMedicalRecordDTO } from "@/lib/validations";

export const GET = withAuth(async (request, { session, params }) => {
  const record = await medicalRecordService.getByPatient(params.id, session.user.id);
  return NextResponse.json({ success: true, data: record });
});

export const PUT = withAuth(async (request, { session, params }) => {
  const body = await request.json();
  const parsed = UpdateMedicalRecordDTO.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  const record = await medicalRecordService.upsert(params.id, parsed.data, session.user.id);
  return NextResponse.json({ success: true, data: record });
});
