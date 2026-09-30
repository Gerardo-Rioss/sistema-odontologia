import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { clinicSettingsRepository } from "@/repositories/clinic-settings.repository";
import { UpdateClinicSettingsDTO } from "@/lib/validations";

/** GET /api/settings — devuelve la configuración del consultorio. */
export const GET = withAuth(async (request, { session }) => {
  const settings = await clinicSettingsRepository.findOrCreate(session.user.id);

  return NextResponse.json({
    clinicName: settings.clinicName ?? "",
    address: settings.address ?? "",
    city: settings.city ?? "",
    phone: settings.phone ?? "",
    openTime: settings.openTime ?? "",
    closeTime: settings.closeTime ?? "",
    workDays: settings.workDays ?? "",
    whatsappReminders: settings.whatsappReminders,
    emailReminders: settings.emailReminders,
    reminderHours: settings.reminderHours,
  });
});

/** PUT /api/settings — actualiza la configuración del consultorio. */
export const PUT = withAuth(async (request, { session }) => {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Body inválido" },
      { status: 400 }
    );
  }

  // Validación con Zod DTO (consistente con el resto del API)
  const parsed = UpdateClinicSettingsDTO.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Datos inválidos",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const data = parsed.data;
  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "No hay campos válidos para actualizar" },
      { status: 400 }
    );
  }

  const settings = await clinicSettingsRepository.update(session.user.id, data);

  return NextResponse.json({
    clinicName: settings.clinicName ?? "",
    address: settings.address ?? "",
    city: settings.city ?? "",
    phone: settings.phone ?? "",
    openTime: settings.openTime ?? "",
    closeTime: settings.closeTime ?? "",
    workDays: settings.workDays ?? "",
    whatsappReminders: settings.whatsappReminders,
    emailReminders: settings.emailReminders,
    reminderHours: settings.reminderHours,
  });
});
