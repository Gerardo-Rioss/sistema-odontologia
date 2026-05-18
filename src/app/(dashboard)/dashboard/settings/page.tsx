/**
 * Página de configuración del sistema.
 * Placeholder — la funcionalidad completa se implementará en la Fase 5.
 */
export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>

      <div className="space-y-4">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Datos del Consultorio
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Nombre, dirección, teléfono y horarios de atención.
          </p>
          <p className="mt-4 text-sm text-gray-400">
            La configuración estará disponible próximamente.
          </p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Preferencias de Notificación
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Configurá cómo y cuándo querés recibir notificaciones.
          </p>
          <p className="mt-4 text-sm text-gray-400">
            Las notificaciones se habilitarán en una fase futura.
          </p>
        </div>
      </div>
    </div>
  );
}
