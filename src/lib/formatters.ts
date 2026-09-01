/**
 * Formatters de fechas, horas, moneda y teléfono.
 *
 * ⚠️ IMPORTANTE (timezone): PostgreSQL guarda las fechas de calendario como
 * `@db.Date` → JSON las serializa como medianoche UTC ("2026-08-18T00:00:00.000Z").
 * Si se formatea con `new Date(iso)` + Intl en una zona negativa (ej: Argentina
 * GMT-3), la medianoche UTC se convierte al día ANTERIOR 21:00 → muestra 17/08
 * en vez de 18/08. Por eso parseamos la parte YYYY-MM-DD manualmente (date-only).
 */

/**
 * Extrae solo la parte de fecha (YYYY-MM-DD) sin timezone.
 * PostgreSQL guarda fechas de calendario como medianoche UTC ("2026-08-18T00:00:00.000Z");
 * en zonas negativas (Argentina GMT-3) new Date() + format las desplaza al día anterior.
 */
function toDateOnly(date: Date | string): Date {
  if (typeof date === "string") {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }
  }
  return new Date(date);
}

/** Devuelve la clave YYYY-MM-DD de una fecha, sin desvío de zona horaria. */
export function dateKeyOf(date: Date | string): string {
  const d = toDateOnly(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Formatea una fecha (Date o string ISO) a formato largo en español.
 * Ejemplo: "15 de junio de 2026"
 */
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(toDateOnly(date));
}

/**
 * Formatea una fecha a formato corto en español.
 * Ejemplo: "15/06/2026"
 */
export function formatShortDate(date: Date | string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(toDateOnly(date));
}

/**
 * Formatea un string de hora HH:mm a formato 24h.
 * Ejemplo: "09:00" → "09:00" (ya está en 24h, normaliza ceros a la izquierda)
 */
export function formatTime(time: string): string {
  const [h, m] = time.split(":");
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
}

/**
 * Formatea un número como moneda (CLP por defecto, ARS alternativo).
 * Ejemplo CLP: "$45.000"
 * Ejemplo ARS: "$45.000,00"
 */
export function formatCurrency(
  amount: number,
  locale: "es-CL" | "es-AR" = "es-CL"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: locale === "es-CL" ? "CLP" : "ARS",
  }).format(amount);
}

/**
 * Formatea un número de teléfono para mostrar.
 * Mantiene el formato original si no puede normalizarlo.
 * Ejemplo: "+5493624567890" → "+549 362 456-7890" (largo)
 * Ejemplo: "3624567890" → "362 456-7890" (local)
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");

  if (phone.startsWith("+549") && digits.length === 13) {
    return `+549 ${digits.slice(3, 6)} ${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  if (phone.startsWith("+54") && digits.length === 12) {
    return `+54 ${digits.slice(2, 5)} ${digits.slice(5, 8)}-${digits.slice(8)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
  return phone;
}
