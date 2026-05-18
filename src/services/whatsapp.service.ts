/**
 * Servicio de integración con WhatsApp Business API.
 */
export class WhatsAppService {
  /**
   * Envía un mensaje de WhatsApp a un paciente.
   */
  async sendMessage(
    _phoneNumber: string,
    _message: string
  ): Promise<{ messageId: string }> {
    throw new Error("WhatsAppService.sendMessage() — no implementado aún");
  }

  /**
   * Envía un recordatorio de cita por WhatsApp.
   */
  async sendAppointmentReminder(
    _phoneNumber: string,
    _patientName: string,
    _dateTime: Date
  ): Promise<{ messageId: string }> {
    throw new Error(
      "WhatsAppService.sendAppointmentReminder() — no implementado aún"
    );
  }

  /**
   * Procesa un mensaje entrante de WhatsApp.
   */
  async processIncomingMessage(_payload: unknown): Promise<void> {
    throw new Error(
      "WhatsAppService.processIncomingMessage() — no implementado aún"
    );
  }
}
