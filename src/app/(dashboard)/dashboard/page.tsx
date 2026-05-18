/**
 * Página principal del dashboard.
 * Muestra un resumen de la actividad del consultorio.
 */
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Panel Principal</h1>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Citas Hoy", value: "0", color: "bg-blue-500" },
          { label: "Pacientes Totales", value: "0", color: "bg-green-500" },
          { label: "Citas Pendientes", value: "0", color: "bg-yellow-500" },
          { label: "Completadas", value: "0", color: "bg-purple-500" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl bg-white p-6 shadow-sm"
          >
            <div className="flex items-center">
              <div className={`${stat.color} h-12 w-12 rounded-lg`} />
              <div className="ml-4">
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stat.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Próximas Citas
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          No hay citas programadas para hoy.
        </p>
      </div>
    </div>
  );
}
