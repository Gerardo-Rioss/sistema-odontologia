/**
 * Auth layout — pantalla centrada con tarjeta para login y registro.
 * Las páginas dentro de (auth) heredan este layout automáticamente.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        {children}
      </div>
    </div>
  );
}
