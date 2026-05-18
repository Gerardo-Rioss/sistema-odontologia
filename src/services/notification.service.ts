/**
 * Servicio de notificaciones (email, push, in-app).
 */
export class NotificationService {
  /**
   * Envía una notificación por correo electrónico.
   */
  async sendEmail(
    _to: string,
    _subject: string,
    _body: string
  ): Promise<void> {
    throw new Error("NotificationService.sendEmail() — no implementado aún");
  }

  /**
   * Notifica un cambio de estado de cita al paciente.
   */
  async notifyAppointmentStatus(
    _patientEmail: string,
    _appointmentDate: Date,
    _status: string
  ): Promise<void> {
    throw new Error(
      "NotificationService.notifyAppointmentStatus() — no implementado aún"
    );
  }

  /**
   * Envía recordatorio de cita 24h antes.
   */
  async sendReminder(_appointmentId: string): Promise<void> {
    throw new Error("NotificationService.sendReminder() — no implementado aún");
  }
}
