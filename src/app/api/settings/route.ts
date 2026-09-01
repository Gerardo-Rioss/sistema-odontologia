import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { clinicSettingsRepository } from "@/repositories/clinic-settings.repository";

/** Campos editables de la configuración del consultorio. */
const EDITABLE_FIELDS = [
  "clinicName",
  "address",
  "city",
  "phone",
  "openTime",
  "closeTime",
  "workDays",
  "whatsappReminders",
  "emailReminders",
  "reminderHours",
] as const;

function sanitize(body: Record<string, unknown>) {
  const clean: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) {
      const value = body[field];
      // Validaciones básicas por tipo
      if (
        field === "whatsappReminders" ||
        field === "emailReminders"
      ) {
        clean[field] = Boolean(value);
      } else if (field === "reminderHours") {
        const hours = Number(value);
        if (Number.isInteger(hours) && hours >= 1 && hours <= 168) {
          clean[field] = hours;
        }
      } else if (typeof value === "string") {
        clean[field] = value.trim();
      }
    }
  }
  return clean;
}

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

  const data = sanitize(body);
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
