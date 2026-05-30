"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import Link from "next/link";
import {
  forgotPasswordSchema,
  type ForgotPasswordSchema,
} from "@/lib/validations";

/**
 * Página de recuperación de contraseña.
 *
 * El usuario ingresa su email y recibe un token de recuperación.
 * En modo desarrollo, el token se muestra en pantalla.
 */
export default function ForgotPasswordPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordSchema>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordSchema) => {
    setError(null);
    setMessage(null);
    setResetToken(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setError(
            json.error || "Demasiados intentos. Intenta de nuevo más tarde."
          );
        } else {
          setError(json.error || "Error al procesar la solicitud");
        }
        return;
      }

      setMessage(json.message);
      if (json.resetToken) {
        setResetToken(json.resetToken);
      }
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
          Recuperar Contraseña
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Ingresá tu correo y te enviaremos un enlace para restablecer tu
          contraseña.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {message}
        </div>
      )}
      {resetToken && (
        <div className="rounded-lg bg-blue-50 p-3 text-sm">
          <p className="font-medium text-blue-800">
            Token de recuperación (modo desarrollo):
          </p>
          <code className="mt-1 block break-all text-blue-900">
            {resetToken}
          </code>
          <p className="mt-2 text-blue-700">
            <Link
              href={`/reset-password?token=${encodeURIComponent(resetToken)}`}
              className="font-medium underline"
            >
              Ir a restablecer contraseña
            </Link>
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            {...register("email")}
            placeholder="correo@consultorio.com"
            className={inputClass(errors.email)}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isLoading ? "Enviando..." : "Enviar Instrucciones"}
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
