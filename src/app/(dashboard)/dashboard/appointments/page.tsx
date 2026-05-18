/**
 * Página de gestión de citas odontológicas.
 * Placeholder — la funcionalidad completa se implementará en la Fase 3.
 */
export default function AppointmentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Citas</h1>
        <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          Nueva Cita
        </button>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <p className="text-center text-gray-500">
          No hay citas registradas todavía. Creá tu primera cita para comenzar.
        </p>
      </div>
    </div>
  );
}
