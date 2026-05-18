/**
 * Conversation Service — WhatsApp bot state machine and NLP.
 *
 * Implements a keyword-based intent detector driving a persistent
 * state machine for dental appointment booking via WhatsApp.
 *
 * State flow: IDLE → GREETING → SERVICE_SELECTION → DATE_SELECTION
 *             → TIME_SELECTION → CONFIRMATION → COMPLETED → IDLE
 *
 * All responses are in warm, friendly Spanish.
 */
import { whatsappService } from "./whatsapp.service";
import { appointmentService } from "./appointment.service";
import type { ConversationState, ConversationContext } from "@/types";
import type { Appointment } from "@prisma/client";

// ─── Intent types ────────────────────────────────────────────

export type Intent =
  | "greeting"
  | "schedule_appointment"
  | "cancel_appointment"
  | "check_hours"
  | "help"
  | "unknown";

// ─── Constants ────────────────────────────────────────────────

const BUSINESS_HOURS_START = 8;
const BUSINESS_HOURS_END = 18;
const LUNCH_HOUR = 13;

// ─── Service ──────────────────────────────────────────────────

export class ConversationService {
  // ─── Intent Detection ──────────────────────────────────────

  /**
   * Ordered regex keyword matching for Spanish intent detection.
   *
   * First match wins. Unknown text falls back to "unknown".
   */
  detectIntent(text: string): Intent {
    const cleaned = text.trim().toLowerCase();

    // Greeting: hola, buenos días, buenas tardes, buenas noches
    if (/\b(hola|buenos?\s*(d[ií]as|tardes|noches))\b/.test(cleaned)) {
      return "greeting";
    }

    // Cancel: cancelar, anular, dar de baja
    if (/\b(cancelar|anular|dar\s+de\s+baja)\b/.test(cleaned)) {
      return "cancel_appointment";
    }

    // Schedule: agendar, cita, turno, reservar, consulta
    if (/\b(agendar|cita|turno|reservar|consulta)\b/.test(cleaned)) {
      return "schedule_appointment";
    }

    // Check hours: horario, disponible, disponibilidad
    if (/\b(horario|disponible|disponibilidad)\b/.test(cleaned)) {
      return "check_hours";
    }

    // Help: ayuda, opciones, menú
    if (/\b(ayuda|opciones|men[uú])\b/.test(cleaned)) {
      return "help";
    }

    return "unknown";
  }

  // ─── Main Entry Point ──────────────────────────────────────

  /**
   * Main conversation entry point called from the webhook.
   *
   * 1. Retrieves or initializes conversation state
   * 2. Checks TTL expiry (5 min)
   * 3. Detects intent
   * 4. Routes to the appropriate state handler
   *
   * Errors are caught and logged — the user receives a friendly
   * error message if something goes wrong.
   */
  async handleMessage(
    phoneNumber: string,
    messageText: string
  ): Promise<void> {
    try {
      const state = await whatsappService.getConversationState(phoneNumber);

      // TTL check is handled inside getConversationState (returns null if expired)

      const intent = this.detectIntent(messageText);

      await this.processState(phoneNumber, state, intent, messageText);
    } catch (error) {
      console.error(
        `[ConversationService] Error handling message from ${phoneNumber}:`,
        error
      );
      // Try to send a friendly error message (fire-and-forget)
      try {
        await whatsappService.sendMessage(
          phoneNumber,
          "😔 Lo siento, ocurrió un error inesperado. Por favor, intentá de nuevo en unos minutos o comunicate con la clínica por teléfono."
        );
      } catch {
        // Silently fail if we can't even send the error message
      }
    }
  }

  /**
   * Routes the message to the appropriate handler based on
   * current conversation state and detected intent.
   */
  async processState(
    phoneNumber: string,
    state: ConversationState | null,
    intent: Intent,
    messageText: string
  ): Promise<void> {
    const trimmed = messageText.trim();

    // ── Cancellation pending (awaiting interactive list selection) ──
    if (state?.context?.awaitingCancellation) {
      await this.handleCancellationSelection(phoneNumber, trimmed);
      return;
    }

    // ── Mid-flow abort: "cancelar" / "no" during conversation ──
    if (state && state.currentState !== "IDLE" && state.currentState !== "COMPLETED") {
      if (intent === "cancel_appointment" || /\b(?:cancelar|no)\b/i.test(trimmed)) {
        await whatsappService.clearConversationState(phoneNumber);
        await whatsappService.sendMessage(
          phoneNumber,
          "✅ Operación cancelada. ¿En qué más puedo ayudarte? Escribí *hola* para ver las opciones."
        );
        return;
      }
    }

    // ── Route by current state ──
    if (!state || state.currentState === "IDLE") {
      await this.routeIdle(phoneNumber, intent);
    } else {
      switch (state.currentState) {
        case "GREETING":
        case "SERVICE_SELECTION":
          await this.handleServiceSelection(phoneNumber, trimmed);
          break;
        case "DATE_SELECTION":
          await this.handleDateSelection(phoneNumber, trimmed, state.context);
          break;
        case "TIME_SELECTION":
          await this.handleTimeSelection(phoneNumber, trimmed, state.context);
          break;
        case "CONFIRMATION":
          await this.handleConfirmation(phoneNumber, trimmed, state.context);
          break;
        case "COMPLETED":
          // Start over
          await this.routeIdle(phoneNumber, intent);
          break;
      }
    }
  }

  // ─── Idle State Router ─────────────────────────────────────

  private async routeIdle(
    phoneNumber: string,
    intent: Intent
  ): Promise<void> {
    switch (intent) {
      case "cancel_appointment":
        await this.handleCancellation(phoneNumber);
        break;
      case "greeting":
      case "schedule_appointment":
      case "check_hours":
      case "help":
      default:
        await this.handleGreeting(phoneNumber);
        break;
    }
  }

  // ─── State Handlers ────────────────────────────────────────

  /**
   * Sends welcome message and interactive service picker.
   * Sets state → SERVICE_SELECTION.
   */
  async handleGreeting(phoneNumber: string): Promise<void> {
    await whatsappService.sendMessage(
      phoneNumber,
      "👋 ¡Hola! Bienvenido/a a la *Clínica Dental*.\n\n" +
        "Estoy acá para ayudarte a agendar, consultar o cancelar tus citas. 😊"
    );

    await whatsappService.sendInteractiveList(
      phoneNumber,
      "Seleccioná el tipo de consulta",
      "¿Qué tipo de atención necesitás?",
      "Ver opciones",
      [
        {
          title: "Tipos de consulta",
          rows: [
            {
              id: "limpieza",
              title: "🪥 Limpieza dental",
              description: "Limpieza y profilaxis",
            },
            {
              id: "revision",
              title: "🔍 Revisión general",
              description: "Control y diagnóstico",
            },
            {
              id: "urgencia",
              title: "🚨 Urgencia",
              description: "Dolor o emergencia",
            },
            {
              id: "tratamiento",
              title: "💊 Otro tratamiento",
              description: "Consulta por otro motivo",
            },
          ],
        },
      ]
    );

    await whatsappService.saveConversationState(
      phoneNumber,
      "SERVICE_SELECTION"
    );
  }

  /**
   * Parses the selected service type and asks for a date.
   * Sets state → DATE_SELECTION.
   */
  async handleServiceSelection(
    phoneNumber: string,
    text: string
  ): Promise<void> {
    const serviceType = this.parseServiceType(text);

    if (!serviceType) {
      await whatsappService.sendMessage(
        phoneNumber,
        "🤔 No reconocí esa opción. Por favor, seleccioná una de las opciones del menú:\n\n" +
          "• *Limpieza dental*\n" +
          "• *Revisión general*\n" +
          "• *Urgencia*\n" +
          "• *Otro tratamiento*"
      );
      return;
    }

    const serviceLabels: Record<string, string> = {
      LIMPIEZA: "Limpieza dental",
      REVISION: "Revisión general",
      URGENCIA: "Urgencia",
      TRATAMIENTO: "Otro tratamiento",
      OTRO: "Otro tratamiento",
    };

    const label = serviceLabels[serviceType] || serviceType;

    await whatsappService.saveConversationState(
      phoneNumber,
      "DATE_SELECTION",
      { selectedService: serviceType }
    );

    await whatsappService.sendMessage(
      phoneNumber,
      `✅ Seleccionaste: *${label}*\n\n` +
        "¿Para qué día querés agendar la cita?\n\n" +
        "Podés escribir:\n" +
        "• *hoy* o *mañana*\n" +
        "• Un día: *lunes*, *martes*, etc.\n" +
        "• Una fecha: *15/06* o *15/06/2026*"
    );
  }

  /**
   * Parses the date, validates it, shows available time slots.
   * Sets state → TIME_SELECTION.
   */
  async handleDateSelection(
    phoneNumber: string,
    text: string,
    context: ConversationContext
  ): Promise<void> {
    const date = this.parseDate(text);

    if (!date) {
      await whatsappService.sendMessage(
        phoneNumber,
        "❌ No pude entender la fecha. ¿Podés escribirla de nuevo?\n\n" +
          "Ejemplos: *hoy*, *mañana*, *lunes*, *15/06* o *15/06/2026*"
      );
      return;
    }

    // Validate date is not in the past
    const today = this.formatDate(new Date());
    if (date < today) {
      await whatsappService.sendMessage(
        phoneNumber,
        "⏪ Esa fecha ya pasó. Por favor, elegí una fecha de hoy en adelante."
      );
      return;
    }

    const dentistUserId = process.env.DENTIST_USER_ID;
    if (!dentistUserId) {
      throw new Error("DENTIST_USER_ID is not configured");
    }

    const slots = await whatsappService.getAvailableSlots(date, dentistUserId);
    const availableSlots = slots.filter((s) => s.available);

    if (availableSlots.length === 0) {
      await whatsappService.sendMessage(
        phoneNumber,
        "😔 No hay horarios disponibles para esa fecha. ¿Querés probar con otra fecha?\n\n" +
          "Escribí el día que te quede mejor."
      );
      return;
    }

    await whatsappService.saveConversationState(
      phoneNumber,
      "TIME_SELECTION",
      {
        ...context,
        selectedDate: date,
      }
    );

    const slotsList = availableSlots
      .map((s) => `• *${s.time}*`)
      .join("\n");

    await whatsappService.sendMessage(
      phoneNumber,
      `📅 Fecha seleccionada: *${this.formatDateForDisplay(date)}*\n\n` +
        "Horarios disponibles:\n" +
        `${slotsList}\n\n` +
        "¿A qué hora preferís? Escribí el horario (ej: *10:00* o *14:30*)"
    );
  }

  /**
   * Parses the time, validates it's in available slots,
   * and asks for confirmation.
   * Sets state → CONFIRMATION.
   */
  async handleTimeSelection(
    phoneNumber: string,
    text: string,
    context: ConversationContext
  ): Promise<void> {
    const time = this.parseTime(text);

    if (!time) {
      await whatsappService.sendMessage(
        phoneNumber,
        "❌ No pude entender el horario. Escribilo en formato *HH:mm* (por ejemplo: *10:00* o *14:30*).\n\n" +
          "Recordá que atendemos de 8:00 a 18:00 (excepto 13:00 a 14:00)."
      );
      return;
    }

    const date = context.selectedDate;
    if (!date) {
      await whatsappService.sendMessage(
        phoneNumber,
        "😅 Parece que hubo un problema con la fecha. Volvamos a empezar.\nEscribí *hola* para comenzar de nuevo."
      );
      await whatsappService.clearConversationState(phoneNumber);
      return;
    }

    const dentistUserId = process.env.DENTIST_USER_ID;
    if (!dentistUserId) {
      throw new Error("DENTIST_USER_ID is not configured");
    }

    // Double-check slot availability
    const slots = await whatsappService.getAvailableSlots(date, dentistUserId);
    const slot = slots.find((s) => s.time === time);

    if (!slot || !slot.available) {
      await whatsappService.sendMessage(
        phoneNumber,
        "⏰ Ese horario ya no está disponible. ¿Podés elegir otro?\n\n" +
          "Estos son los horarios libres:\n" +
          slots
            .filter((s) => s.available)
            .map((s) => `• *${s.time}*`)
            .join("\n")
      );
      return;
    }

    const serviceType = context.selectedService || "consulta";
    const serviceLabels: Record<string, string> = {
      LIMPIEZA: "Limpieza dental",
      REVISION: "Revisión general",
      URGENCIA: "Urgencia",
      TRATAMIENTO: "Otro tratamiento",
      OTRO: "Otro tratamiento",
    };
    const serviceLabel = serviceLabels[serviceType] || serviceType;

    await whatsappService.saveConversationState(
      phoneNumber,
      "CONFIRMATION",
      {
        ...context,
        selectedTime: time,
      }
    );

    const dateDisplay = this.formatDateForDisplay(date);

    await whatsappService.sendMessage(
      phoneNumber,
      `📋 *Resumen de tu cita:*\n\n` +
        `• Tipo: *${serviceLabel}*\n` +
        `• Fecha: *${dateDisplay}*\n` +
        `• Hora: *${time}*\n\n` +
        "¿Confirmás la cita?\n" +
        "Respondé *sí* para confirmar o *no* para cancelar."
    );
  }

  /**
   * Handles confirmation or rejection of the appointment.
   * If confirmed: creates the appointment and sends confirmation.
   * If rejected: clears the state.
   */
  async handleConfirmation(
    phoneNumber: string,
    text: string,
    context: ConversationContext
  ): Promise<void> {
    const trimmed = text.trim().toLowerCase();

    // Rejection
    if (/^(no|cancelar|nop|nah)$/i.test(trimmed)) {
      await whatsappService.clearConversationState(phoneNumber);
      await whatsappService.sendMessage(
        phoneNumber,
        "👌 Cita cancelada. Si necesitás agendar para otro momento, escribí *hola* cuando quieras."
      );
      return;
    }

    // Confirmation: sí, confirmar, ok, dale, etc.
    if (!/^(s[ií]|confirmar|ok|dale|bueno|aceptar|confirmo)\b/i.test(trimmed)) {
      await whatsappService.sendMessage(
        phoneNumber,
        "🤔 No entendí tu respuesta. ¿Confirmás la cita?\nRespondé *sí* para confirmar o *no* para cancelar."
      );
      return;
    }

    const date = context.selectedDate;
    const time = context.selectedTime;
    const serviceType = context.selectedService;

    if (!date || !time || !serviceType) {
      await whatsappService.sendMessage(
        phoneNumber,
        "😅 Faltan datos de la cita. Volvamos a empezar.\nEscribí *hola* para comenzar de nuevo."
      );
      await whatsappService.clearConversationState(phoneNumber);
      return;
    }

    const dentistUserId = process.env.DENTIST_USER_ID;
    if (!dentistUserId) {
      throw new Error("DENTIST_USER_ID is not configured");
    }

    // ═══ Slot collision re-check ═══
    const slots = await whatsappService.getAvailableSlots(date, dentistUserId);
    const slot = slots.find((s) => s.time === time);

    if (!slot || !slot.available) {
      await whatsappService.sendMessage(
        phoneNumber,
        "😔 Ese horario ya no está disponible. Alguien lo reservó mientras elegías.\n\n" +
          "Vamos a buscar otra fecha. ¿Qué día te queda mejor?\n" +
          "Ej: *mañana*, *lunes*, *20/06*"
      );
      await whatsappService.saveConversationState(
        phoneNumber,
        "DATE_SELECTION",
        {
          selectedService: serviceType,
          // Clear date/time since we're restarting date selection
          selectedDate: undefined,
          selectedTime: undefined,
        }
      );
      return;
    }

    // Get or create patient
    const patient = await whatsappService.getPatientByPhone(phoneNumber);

    // Create appointment
    let appointment: Appointment;
    try {
      appointment = await appointmentService.schedule(
        {
          patientId: patient.id,
          date,
          time,
          type: serviceType as Appointment["type"],
        },
        dentistUserId
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Conflicto de horario")
      ) {
        await whatsappService.sendMessage(
          phoneNumber,
          "😔 Ese horario ya no está disponible. Alguien lo reservó mientras confirmabas.\n\n" +
            "Vamos a buscar otra fecha. ¿Qué día te queda mejor?\n" +
            "Ej: *mañana*, *lunes*, *20/06*"
        );
        await whatsappService.saveConversationState(
          phoneNumber,
          "DATE_SELECTION",
          {
            selectedService: serviceType,
            selectedDate: undefined,
            selectedTime: undefined,
          }
        );
        return;
      }
      throw error;
    }

    const dateDisplay = this.formatDateForDisplay(date);

    // Send confirmation
    await whatsappService.sendMessage(
      phoneNumber,
      `✅ ¡Cita confirmada! 🎉\n\n` +
        `📋 *Detalles:*\n` +
        `• Fecha: *${dateDisplay}*\n` +
        `• Hora: *${time}*\n\n` +
        `Si necesitás cancelar o modificar, escribí *cancelar*.\n` +
        `¡Te esperamos! 😁`
    );

    // Try to send a template message as well
    try {
      await whatsappService.sendTemplate(
        phoneNumber,
        "appointment_confirmation"
      );
    } catch {
      // Template send is best-effort
    }

    await whatsappService.saveConversationState(
      phoneNumber,
      "COMPLETED",
      {
        appointmentId: appointment.id,
      }
    );
  }

  /**
   * Finds active (CONFIRMED) appointments for the patient's phone
   * and sends an interactive list for selection.
   */
  async handleCancellation(phoneNumber: string): Promise<void> {
    const dentistUserId = process.env.DENTIST_USER_ID;
    if (!dentistUserId) {
      throw new Error("DENTIST_USER_ID is not configured");
    }

    // Find patient
    let patient;
    try {
      patient = await whatsappService.getPatientByPhone(phoneNumber);
    } catch {
      await whatsappService.sendMessage(
        phoneNumber,
        "Todavía no tenés citas registradas con nosotros. Escribí *hola* si querés agendar una."
      );
      return;
    }

    // Get CONFIRMED appointments for this patient
    const allAppointments = await appointmentService.getAll(dentistUserId, {
      status: "CONFIRMED",
    });

    const patientAppointments = allAppointments.filter(
      (a) => a.patientId === patient.id
    );

    if (patientAppointments.length === 0) {
      await whatsappService.sendMessage(
        phoneNumber,
        "No tenés citas activas para cancelar. Escribí *hola* si querés agendar una nueva."
      );
      return;
    }

    // Send interactive list
    const sections = [
      {
        title: "Tus citas activas",
        rows: patientAppointments.map((a) => {
          const dateDisplay = this.formatDateForDisplay(
            a.date.toISOString().slice(0, 10)
          );
          return {
            id: a.id,
            title: `${dateDisplay} ${a.time}`,
            description: a.type,
          };
        }),
      },
    ];

    await whatsappService.sendInteractiveList(
      phoneNumber,
      "Cancelar cita",
      "Seleccioná la cita que querés cancelar:",
      "Ver citas",
      sections
    );

    // Set flag so next message is treated as cancellation selection
    await whatsappService.saveConversationState(
      phoneNumber,
      "IDLE",
      { awaitingCancellation: true }
    );
  }

  /**
   * Handles the reply to a cancellation interactive list.
   * The message text should be the appointment ID.
   */
  private async handleCancellationSelection(
    phoneNumber: string,
    appointmentId: string
  ): Promise<void> {
    const dentistUserId = process.env.DENTIST_USER_ID;
    if (!dentistUserId) {
      throw new Error("DENTIST_USER_ID is not configured");
    }

    try {
      await appointmentService.cancel(appointmentId, dentistUserId);
      await whatsappService.clearConversationState(phoneNumber);
      await whatsappService.sendMessage(
        phoneNumber,
        "✅ Tu cita ha sido cancelada. Si necesitás agendar una nueva, escribí *hola*."
      );
    } catch (error) {
      console.error(
        `[ConversationService] Error cancelling appointment ${appointmentId}:`,
        error
      );
      await whatsappService.clearConversationState(phoneNumber);
      await whatsappService.sendMessage(
        phoneNumber,
        "😔 No se pudo cancelar la cita. Por favor, comunicate con la clínica por teléfono."
      );
    }
  }

  // ─── Parsing Helpers ───────────────────────────────────────

  /**
   * Parses a date from natural Spanish text.
   *
   * Accepted formats:
   *  - "hoy" → today
   *  - "mañana" → tomorrow
   *  - Day names: "lunes" ... "domingo" → next occurrence
   *  - "DD/MM" → current year
   *  - "DD/MM/YYYY" → exact date
   *
   * @returns ISO date string (YYYY-MM-DD) or null if unrecognized
   */
  parseDate(text: string): string | null {
    const cleaned = text.trim().toLowerCase();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // "hoy"
    if (cleaned === "hoy") {
      return this.formatDate(today);
    }

    // "mañana"
    if (cleaned === "mañana" || cleaned === "manana") {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return this.formatDate(tomorrow);
    }

    // Day names
    const dayMap: Record<string, number> = {
      domingo: 0,
      lunes: 1,
      martes: 2,
      "miércoles": 3,
      miercoles: 3,
      jueves: 4,
      viernes: 5,
      "sábado": 6,
      sabado: 6,
    };

    if (dayMap[cleaned] !== undefined) {
      const targetDay = dayMap[cleaned];
      const currentDay = today.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7; // next week
      const target = new Date(today);
      target.setDate(target.getDate() + daysUntil);
      return this.formatDate(target);
    }

    // DD/MM or DD/MM/YYYY
    const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      const year = match[3] ? parseInt(match[3], 10) : today.getFullYear();

      if (month < 1 || month > 12 || day < 1 || day > 31) return null;

      const date = new Date(year, month - 1, day);
      // Validate the date is real (handles Feb 30, etc.)
      if (
        date.getDate() !== day ||
        date.getMonth() !== month - 1 ||
        date.getFullYear() !== year
      ) {
        return null;
      }

      return this.formatDate(date);
    }

    return null;
  }

  /**
   * Parses a time from text.
   *
   * Accepted formats:
   *  - "HH:mm" → exact
   *  - "HHmm" → exact
   *  - "HH" → on the hour
   *
   * Validated against business hours (8:00–18:00, lunch 13:00–14:00 excluded).
   *
   * @returns "HH:mm" string or null if invalid
   */
  parseTime(text: string): string | null {
    const cleaned = text.trim();

    // HH:mm
    let match = cleaned.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      const hour = parseInt(match[1], 10);
      const minute = parseInt(match[2], 10);
      if (
        hour >= BUSINESS_HOURS_START &&
        hour < BUSINESS_HOURS_END &&
        !(hour === LUNCH_HOUR && minute >= 0 && minute < 60) &&
        minute >= 0 &&
        minute < 60
      ) {
        return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      }
      return null;
    }

    // HHmm
    match = cleaned.match(/^(\d{2})(\d{2})$/);
    if (match) {
      const hour = parseInt(match[1], 10);
      const minute = parseInt(match[2], 10);
      if (
        hour >= BUSINESS_HOURS_START &&
        hour < BUSINESS_HOURS_END &&
        !(hour === LUNCH_HOUR) &&
        minute >= 0 &&
        minute < 60
      ) {
        return `${match[1]}:${match[2]}`;
      }
      return null;
    }

    // HH (just hour)
    match = cleaned.match(/^(\d{1,2})$/);
    if (match) {
      const hour = parseInt(match[1], 10);
      if (
        hour >= BUSINESS_HOURS_START &&
        hour < BUSINESS_HOURS_END &&
        hour !== LUNCH_HOUR
      ) {
        return `${hour.toString().padStart(2, "0")}:00`;
      }
      return null;
    }

    return null;
  }

  /**
   * Parses the service type from user text or interactive list reply ID.
   *
   * @returns AppointmentType string or null if unrecognized
   */
  parseServiceType(text: string): string | null {
    const cleaned = text.trim().toLowerCase();

    if (/limpieza/i.test(cleaned)) return "LIMPIEZA";
    if (/revisi[oó]n/i.test(cleaned)) return "REVISION";
    if (/urgencia/i.test(cleaned)) return "URGENCIA";
    if (/tratamiento/i.test(cleaned)) return "TRATAMIENTO";
    if (/otro/i.test(cleaned)) return "OTRO";

    return null;
  }

  // ─── Date Helpers ──────────────────────────────────────────

  /** Formats a Date as YYYY-MM-DD. */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  /** Formats a YYYY-MM-DD date for friendly display in Spanish. */
  private formatDateForDisplay(isoDate: string): string {
    const [year, month, day] = isoDate.split("-");
    const monthNames = [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ];
    const monthIndex = parseInt(month, 10) - 1;
    const monthName = monthNames[monthIndex] || month;
    return `${parseInt(day, 10)} de ${monthName} de ${year}`;
  }
}

/** Singleton instance of the conversation service. */
export const conversationService = new ConversationService();
