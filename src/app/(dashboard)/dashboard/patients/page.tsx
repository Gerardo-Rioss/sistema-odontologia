/**
 * Página de gestión de pacientes.
 * Placeholder — la funcionalidad completa se implementará en la Fase 3.
 */
export default function PatientsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Pacientes</h1>
        <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          Nuevo Paciente
        </button>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <p className="text-center text-gray-500">
          No hay pacientes registrados todavía. Agregá tu primer paciente para
          comenzar.
        </p>
      </div>
    </div>
  );
}
