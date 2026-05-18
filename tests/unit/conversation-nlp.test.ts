/**
 * Tests unitarios para el detector de intenciones (NLP por keywords).
 *
 * Cubre:
 *  - Detección de cada intent por keywords en español
 *  - Orden de prioridad (greeting > cancel > schedule > check_hours > help)
 *  - Texto irreconocible → "unknown"
 *  - Parsing de fechas en múltiples formatos
 *  - Parsing de horarios
 *  - Parsing de tipo de servicio
 *
 * NOTA: Estos tests compilan y type-checkean pero no se ejecutan
 * (TDD deshabilitado en este proyecto).
 */
import { ConversationService } from "@/services/conversation.service";
import type { Intent } from "@/services/conversation.service";

const service = new ConversationService();

// ─── detectIntent: keyword matching ──────────────────────────

describe("detectIntent — keyword matching", () => {
  // Greeting
  it.each([
    ["hola"],
    ["Hola"],
    ["HOLA"],
    ["buenos días"],
    ["buenos dias"],
    ["buenas tardes"],
    ["buenas noches"],
    ["  hola  "],
  ])('debe detectar "greeting" para: "%s"', (text) => {
    expect(service.detectIntent(text)).toBe("greeting");
  });

  // Cancel
  it.each([
    ["cancelar"],
    ["Cancelar"],
    ["anular"],
    ["dar de baja"],
    ["quiero cancelar mi cita"],
    ["anular cita"],
  ])('debe detectar "cancel_appointment" para: "%s"', (text) => {
    expect(service.detectIntent(text)).toBe("cancel_appointment");
  });

  // Schedule
  it.each([
    ["agendar"],
    ["cita"],
    ["turno"],
    ["reservar"],
    ["consulta"],
    ["quiero agendar una cita"],
    ["necesito un turno"],
  ])('debe detectar "schedule_appointment" para: "%s"', (text) => {
    expect(service.detectIntent(text)).toBe("schedule_appointment");
  });

  // Check hours
  it.each([
    ["horario"],
    ["horarios"],
    ["disponible"],
    ["disponibilidad"],
    ["qué horarios tenés"],
  ])('debe detectar "check_hours" para: "%s"', (text) => {
    expect(service.detectIntent(text)).toBe("check_hours");
  });

  // Help
  it.each([
    ["ayuda"],
    ["opciones"],
    ["menú"],
    ["menu"],
    ["necesito ayuda"],
  ])('debe detectar "help" para: "%s"', (text) => {
    expect(service.detectIntent(text)).toBe("help");
  });

  // Unknown
  it.each([
    ["asdfgh"],
    ["12345"],
    [""],
    ["cualquier cosa que no coincida"],
    ["blablabla"],
  ])('debe retornar "unknown" para: "%s"', (text) => {
    expect(service.detectIntent(text)).toBe("unknown");
  });

  // Priority: greeting beats schedule (word-boundary)
  it('"hola quiero agendar" → greeting (first match wins)', () => {
    expect(service.detectIntent("hola quiero agendar")).toBe("greeting");
  });

  // Priority: cancel beats schedule
  it('"cancelar mi cita agendada" → cancel_appointment (cancel matched first)', () => {
    expect(service.detectIntent("cancelar mi cita agendada")).toBe(
      "cancel_appointment"
    );
  });
});

// ─── parseDate ───────────────────────────────────────────────

describe("parseDate — parsing de fechas", () => {
  it('debe reconocer "hoy" como la fecha actual', () => {
    const today = new Date();
    const expected = today.toISOString().slice(0, 10);
    expect(service.parseDate("hoy")).toBe(expected);
  });

  it('debe reconocer "mañana" como la fecha de mañana', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const expected = tomorrow.toISOString().slice(0, 10);
    expect(service.parseDate("mañana")).toBe(expected);
  });

  it('debe reconocer "DD/MM" con año actual', () => {
    const currentYear = new Date().getFullYear();
    const result = service.parseDate("15/06");
    expect(result).toBe(`${currentYear}-06-15`);
  });

  it('debe reconocer "DD/MM/YYYY" con año explícito', () => {
    expect(service.parseDate("15/06/2026")).toBe("2026-06-15");
  });

  it('debe reconocer "01/01/2026"', () => {
    expect(service.parseDate("01/01/2026")).toBe("2026-01-01");
  });

  it("debe retornar null para fechas inválidas (Feb 30)", () => {
    expect(service.parseDate("30/02/2026")).toBeNull();
  });

  it("debe retornar null para mes inválido", () => {
    expect(service.parseDate("15/13/2026")).toBeNull();
  });

  it("debe retornar null para texto no reconocido", () => {
    expect(service.parseDate("ayer")).toBeNull();
    expect(service.parseDate("pasado mañana")).toBeNull();
  });

  it("debe retornar null para string vacío", () => {
    expect(service.parseDate("")).toBeNull();
  });

  // Day names
  it('debe reconocer "lunes" como el próximo lunes', () => {
    const result = service.parseDate("lunes");
    expect(result).not.toBeNull();
    const date = new Date(result!);
    expect(date.getDay()).toBe(1); // Monday
  });

  it('debe reconocer "viernes"', () => {
    const result = service.parseDate("viernes");
    expect(result).not.toBeNull();
    const date = new Date(result!);
    expect(date.getDay()).toBe(5); // Friday
  });
});

// ─── parseTime ───────────────────────────────────────────────

describe("parseTime — parsing de horarios", () => {
  it('debe reconocer "HH:mm" dentro del horario laboral', () => {
    expect(service.parseTime("10:00")).toBe("10:00");
    expect(service.parseTime("14:30")).toBe("14:30");
    expect(service.parseTime("17:00")).toBe("17:00");
  });

  it('debe reconocer "8:00" (inicio del horario)', () => {
    expect(service.parseTime("8:00")).toBe("08:00");
  });

  it('debe reconocer "HHmm" (sin dos puntos)', () => {
    expect(service.parseTime("1000")).toBe("10:00");
    expect(service.parseTime("1430")).toBe("14:30");
  });

  it('debe reconocer "HH" (solo hora)', () => {
    expect(service.parseTime("10")).toBe("10:00");
    expect(service.parseTime("9")).toBe("09:00");
    expect(service.parseTime("16")).toBe("16:00");
  });

  it("debe rechazar horarios antes de las 8:00", () => {
    expect(service.parseTime("7:00")).toBeNull();
    expect(service.parseTime("07:00")).toBeNull();
  });

  it("debe rechazar horarios a las 18:00 o después", () => {
    expect(service.parseTime("18:00")).toBeNull();
    expect(service.parseTime("20:00")).toBeNull();
  });

  it("debe rechazar la hora del almuerzo (13:00)", () => {
    expect(service.parseTime("13:00")).toBeNull();
    expect(service.parseTime("13:30")).toBeNull();
  });

  it("debe retornar null para texto no reconocido", () => {
    expect(service.parseTime("tarde")).toBeNull();
    expect(service.parseTime("")).toBeNull();
    expect(service.parseTime("abc")).toBeNull();
  });
});

// ─── parseServiceType ────────────────────────────────────────

describe("parseServiceType — parsing de tipo de consulta", () => {
  it('debe reconocer "limpieza"', () => {
    expect(service.parseServiceType("limpieza")).toBe("LIMPIEZA");
    expect(service.parseServiceType("Limpieza dental")).toBe("LIMPIEZA");
  });

  it('debe reconocer "revisión"', () => {
    expect(service.parseServiceType("revisión")).toBe("REVISION");
    expect(service.parseServiceType("revision general")).toBe("REVISION");
  });

  it('debe reconocer "urgencia"', () => {
    expect(service.parseServiceType("urgencia")).toBe("URGENCIA");
  });

  it('debe reconocer "tratamiento"', () => {
    expect(service.parseServiceType("tratamiento")).toBe("TRATAMIENTO");
  });

  it('debe reconocer "otro"', () => {
    expect(service.parseServiceType("otro")).toBe("OTRO");
  });

  it("debe retornar null para texto no reconocido", () => {
    expect(service.parseServiceType("ortodoncia")).toBeNull();
    expect(service.parseServiceType("")).toBeNull();
  });
});
