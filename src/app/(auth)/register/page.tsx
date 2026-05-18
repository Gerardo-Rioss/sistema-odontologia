/**
 * Página de registro de nuevo usuario.
 * Placeholder — la funcionalidad completa se implementará en la Fase 2 (Autenticación).
 */
export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Crear Cuenta</h1>
        <p className="mt-2 text-sm text-gray-600">
          Registrate para comenzar a usar el sistema
        </p>
      </div>

      <form className="space-y-4">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700"
          >
            Nombre Completo
          </label>
          <input
            id="name"
            type="text"
            placeholder="Dr. Juan Pérez"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Correo Electrónico
          </label>
          <input
            id="email"
            type="email"
            placeholder="correo@consultorio.com"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700"
          >
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            placeholder="Mínimo 8 caracteres"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Crear Cuenta
        </button>
      </form>

      <p className="text-center text-sm text-gray-500">
        ¿Ya tenés cuenta?{" "}
        <a href="/login" className="font-medium text-blue-600 hover:text-blue-500">
          Iniciá Sesión
        </a>
      </p>
    </div>
  );
}
