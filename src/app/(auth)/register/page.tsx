"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import Link from "next/link";
import { registerSchema } from "@/lib/validations";

/**
 * Esquema extendido con confirmación de contraseña para el formulario cliente.
 */
const registerFormSchema = registerSchema
  .extend({
    confirmPassword: z
      .string({ required_error: "Debes confirmar la contraseña" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerFormSchema>;

/**
 * Página de registro de nuevo usuario.
 *
 * Usa react-hook-form + Zod para validación cliente,
 * POST a /api/auth/register para crear la cuenta,
 * y redirige a /login en caso de éxito.
 */
export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password: data.password,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setError("El correo ya está registrado");
        } else if (res.status === 429) {
          setError(
            json.error || "Demasiados intentos. Intenta de nuevo más tarde."
          );
        } else {
          setError(json.error || "Error al crear la cuenta");
        }
        return;
      }

      setSuccess("Cuenta creada correctamente. Redirigiendo al inicio de sesión...");
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
        <h1 className="text-2xl font-bold text-gray-900">Crear Cuenta</h1>
        <p className="mt-2 text-sm text-gray-600">
          Registrate para comenzar a usar el sistema
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
            htmlFor="firstName"
            className="block text-sm font-medium text-gray-700"
          >
            Nombre
          </label>
          <input
            id="firstName"
            type="text"
            {...register("firstName")}
            placeholder="Juan"
            className={inputClass(errors.firstName)}
          />
          {errors.firstName && (
            <p className="mt-1 text-sm text-red-600">
              {errors.firstName.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="lastName"
            className="block text-sm font-medium text-gray-700"
          >
            Apellido
          </label>
          <input
            id="lastName"
            type="text"
            {...register("lastName")}
            placeholder="Pérez"
            className={inputClass(errors.lastName)}
          />
          {errors.lastName && (
            <p className="mt-1 text-sm text-red-600">
              {errors.lastName.message}
            </p>
          )}
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
            {...register("email")}
            placeholder="correo@consultorio.com"
            className={inputClass(errors.email)}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
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
          {isLoading ? "Creando cuenta..." : "Crear Cuenta"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500">
        ¿Ya tenés cuenta?{" "}
        <Link
          href="/login"
          className="font-medium text-blue-600 hover:text-blue-500"
        >
          Iniciá Sesión
        </Link>
      </p>
    </div>
  );
}
