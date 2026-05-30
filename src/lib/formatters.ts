/**
 * Formatea una fecha (Date o string ISO) a formato largo en español.
 * Ejemplo: "15 de junio de 2026"
 */
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "long",
  }).format(new Date(date));
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
  }).format(new Date(date));
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
    currency: locale === "es-AR" ? "ARS" : "CLP",
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formatea un número de teléfono (Chile o Argentina).
 * Detecta automáticamente según el largo del número limpio.
 * Ejemplo 9 dígitos (Chile): "9 1234 5678"
 * Ejemplo 11 dígitos (internacional): "+56 9 1234 5678"
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 9) {
    return `${cleaned.slice(0, 1)} ${cleaned.slice(1, 5)} ${cleaned.slice(5)}`;
  }
  if (cleaned.length === 11) {
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 3)} ${cleaned.slice(3, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}
