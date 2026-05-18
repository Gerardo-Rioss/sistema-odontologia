/**
 * Servicio de sincronización con calendarios externos (Google Calendar).
 */
export class CalendarService {
  /**
   * Sincroniza las citas del sistema con Google Calendar.
   */
  async sync(): Promise<{ synced: number; errors: number }> {
    throw new Error("CalendarService.sync() — no implementado aún");
  }

  /**
   * Crea un evento en el calendario externo.
   */
  async createEvent(_appointmentId: string): Promise<string> {
    throw new Error("CalendarService.createEvent() — no implementado aún");
  }

  /**
   * Actualiza un evento en el calendario externo.
   */
  async updateEvent(_appointmentId: string): Promise<void> {
    throw new Error("CalendarService.updateEvent() — no implementado aún");
  }

  /**
   * Elimina un evento del calendario externo.
   */
  async deleteEvent(_appointmentId: string): Promise<void> {
    throw new Error("CalendarService.deleteEvent() — no implementado aún");
  }
}
