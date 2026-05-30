"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { z } from "zod";
import Link from "next/link";
import { resetPasswordSchema } from "@/lib/validations";

/**
 * Esquema extendido con confirmación de contraseña para el formulario cliente.
 */
const resetFormSchema = resetPasswordSchema
  .extend({
    confirmPassword: z
      .string({ required_error: "Debes confirmar la contraseña" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type ResetFormValues = z.infer<typeof resetFormSchema>;

/**
 * Componente interno que usa useSearchParams.
 * Debe estar envuelto en Suspense por requerimiento de Next.js.
 */
function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetFormSchema),
  });

  // Precargar el token desde la URL si viene como query param
  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (tokenParam) {
      setValue("token", tokenParam);
    }
  }, [searchParams, setValue]);

  const onSubmit = async (data: ResetFormValues) => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: data.token,
          password: data.password,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Error al restablecer la contraseña");
        return;
      }

      setSuccess(
        "Contraseña actualizada correctamente. Redirigiendo al inicio de sesión..."
      );
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = (fieldError: unknown) =>
    `mt-1 block w-full rounded-lg border px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 ${
      fieldError
        ? "border-red-500 focus:border-red-500 focus:ring-red-500"
        : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
    }`;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Restablecer Contraseña
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Ingresá el token de recuperación y tu nueva contraseña.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label
            htmlFor="token"
            className="block text-sm font-medium text-gray-700"
          >
            Token de Recuperación
          </label>
          <input
            id="token"
            type="text"
            {...register("token")}
            placeholder="Pegá el token acá"
            className={inputClass(errors.token)}
          />
          {errors.token && (
            <p className="mt-1 text-sm text-red-600">
              {errors.token.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700"
          >
            Nueva Contraseña
          </label>
          <input
            id="password"
            type="password"
            {...register("password")}
            placeholder="Mínimo 8 caracteres"
            className={inputClass(errors.password)}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">
              {errors.password.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-700"
          >
            Confirmar Contraseña
          </label>
          <input
            id="confirmPassword"
            type="password"
            {...register("confirmPassword")}
            placeholder="Repetí la contraseña"
            className={inputClass(errors.confirmPassword)}
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isLoading ? "Actualizando..." : "Actualizar Contraseña"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500">
        <Link
          href="/login"
          className="font-medium text-blue-600 hover:text-blue-500"
        >
          Volver a Iniciar Sesión
        </Link>
      </p>
    </div>
  );
}

/**
 * Página de restablecimiento de contraseña.
 *
 * Envuelve ResetPasswordForm en Suspense porque useSearchParams()
 * requiere un límite de Suspense en Next.js App Router.
 */
export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center text-sm text-gray-500">Cargando...</div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
