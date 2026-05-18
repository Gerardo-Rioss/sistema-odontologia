/**
 * Página de estadísticas del consultorio.
 * Placeholder — la funcionalidad completa se implementará en la Fase 4.
 */
export default function StatisticsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Estadísticas</h1>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Resumen del Consultorio
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Los gráficos y estadísticas estarán disponibles una vez que haya datos
          en el sistema.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">
            Citas por Mes
          </h3>
          <div className="mt-4 flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-gray-200">
            <p className="text-sm text-gray-400">Gráfico próximamente</p>
          </div>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">
            Tratamientos más Comunes
          </h3>
          <div className="mt-4 flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-gray-200">
            <p className="text-sm text-gray-400">Gráfico próximamente</p>
          </div>
        </div>
      </div>
    </div>
  );
}
