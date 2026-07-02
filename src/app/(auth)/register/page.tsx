"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { registerSchema } from "@/lib/validations";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Crear Cuenta</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Registrate para comenzar a usar el sistema
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl bg-green-100 p-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-400">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="firstName">Nombre</Label>
          <Input
            id="firstName"
            type="text"
            {...register("firstName")}
            placeholder="Juan"
            aria-invalid={!!errors.firstName}
          />
          {errors.firstName && (
            <p className="mt-1 text-sm text-destructive">
              {errors.firstName.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="lastName">Apellido</Label>
          <Input
            id="lastName"
            type="text"
            {...register("lastName")}
            placeholder="Pérez"
            aria-invalid={!!errors.lastName}
          />
          {errors.lastName && (
            <p className="mt-1 text-sm text-destructive">
              {errors.lastName.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="email">Correo Electrónico</Label>
          <Input
            id="email"
            type="email"
            {...register("email")}
            placeholder="correo@consultorio.com"
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            type="password"
            {...register("password")}
            placeholder="Mínimo 8 caracteres"
            aria-invalid={!!errors.password}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
          <Input
            id="confirmPassword"
            type="password"
            {...register("confirmPassword")}
            placeholder="Repetí la contraseña"
            aria-invalid={!!errors.confirmPassword}
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-destructive">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creando cuenta...
            </>
          ) : (
            "Crear Cuenta"
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tenés cuenta?{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:text-primary/80"
        >
          Iniciá Sesión
        </Link>
      </p>
    </div>
  );
}
