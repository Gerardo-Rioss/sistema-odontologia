/**
 * Tests unitarios para esquemas de validación Zod de autenticación.
 *
 * Cubre los escenarios de spec/user-auth:
 *  - Registro: campos requeridos, formato de email, longitud mínima de password
 *  - Login: campos requeridos, formato de email
 *  - Recuperación: formato de email, token requerido, password min 8
 *
 * NOTA: Estos tests compilan y type-checkean pero no se ejecutan
 * (TDD deshabilitado en este proyecto).
 */

import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validations";

// ─── loginSchema ─────────────────────────────────────────────

describe("loginSchema", () => {
  it("debe aceptar credenciales válidas", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "Test1234",
    });
    expect(result.success).toBe(true);
  });

  it("debe rechazar email inválido", () => {
    const result = loginSchema.safeParse({
      email: "no-es-email",
      password: "Test1234",
    });
    expect(result.success).toBe(false);
  });

  it("debe rechazar email vacío", () => {
    const result = loginSchema.safeParse({
      email: "",
      password: "Test1234",
    });
    expect(result.success).toBe(false);
  });

  it("debe rechazar password vacío", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });

  it("debe rechazar objeto sin email", () => {
    const result = loginSchema.safeParse({
      password: "Test1234",
    });
    expect(result.success).toBe(false);
  });

  it("debe rechazar objeto sin password", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
    });
    expect(result.success).toBe(false);
  });
});

// ─── registerSchema ──────────────────────────────────────────

describe("registerSchema", () => {
  it("debe aceptar datos de registro válidos", () => {
    const result = registerSchema.safeParse({
      email: "nuevo@example.com",
      password: "Test1234",
      firstName: "Juan",
      lastName: "Pérez",
    });
    expect(result.success).toBe(true);
  });

  it("debe rechazar password menor a 8 caracteres", () => {
    const result = registerSchema.safeParse({
      email: "nuevo@example.com",
      password: "1234567",
      firstName: "Juan",
      lastName: "Pérez",
    });
    expect(result.success).toBe(false);
  });

  it("debe aceptar password de exactamente 8 caracteres", () => {
    const result = registerSchema.safeParse({
      email: "nuevo@example.com",
      password: "12345678",
      firstName: "Juan",
      lastName: "Pérez",
    });
    expect(result.success).toBe(true);
  });

  it("debe rechazar email inválido", () => {
    const result = registerSchema.safeParse({
      email: "correo-mal",
      password: "Test1234",
      firstName: "Juan",
      lastName: "Pérez",
    });
    expect(result.success).toBe(false);
  });

  it("debe rechazar firstName vacío", () => {
    const result = registerSchema.safeParse({
      email: "test@example.com",
      password: "Test1234",
      firstName: "",
      lastName: "Pérez",
    });
    expect(result.success).toBe(false);
  });

  it("debe rechazar lastName vacío", () => {
    const result = registerSchema.safeParse({
      email: "test@example.com",
      password: "Test1234",
      firstName: "Juan",
      lastName: "",
    });
    expect(result.success).toBe(false);
  });

  it("debe rechazar objeto sin firstName", () => {
    const result = registerSchema.safeParse({
      email: "test@example.com",
      password: "Test1234",
      lastName: "Pérez",
    });
    expect(result.success).toBe(false);
  });
});

// ─── forgotPasswordSchema ────────────────────────────────────

describe("forgotPasswordSchema", () => {
  it("debe aceptar email válido", () => {
    const result = forgotPasswordSchema.safeParse({
      email: "test@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("debe rechazar email inválido", () => {
    const result = forgotPasswordSchema.safeParse({
      email: "correo-mal",
    });
    expect(result.success).toBe(false);
  });

  it("debe rechazar objeto vacío", () => {
    const result = forgotPasswordSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ─── resetPasswordSchema ─────────────────────────────────────

describe("resetPasswordSchema", () => {
  it("debe aceptar token y password válidos", () => {
    const result = resetPasswordSchema.safeParse({
      token: "abc-123-def-456",
      password: "NuevaClave1",
    });
    expect(result.success).toBe(true);
  });

  it("debe rechazar token vacío", () => {
    const result = resetPasswordSchema.safeParse({
      token: "",
      password: "NuevaClave1",
    });
    expect(result.success).toBe(false);
  });

  it("debe rechazar password menor a 8 caracteres", () => {
    const result = resetPasswordSchema.safeParse({
      token: "abc-123",
      password: "1234567",
    });
    expect(result.success).toBe(false);
  });

  it("debe rechazar objeto sin token", () => {
    const result = resetPasswordSchema.safeParse({
      password: "NuevaClave1",
    });
    expect(result.success).toBe(false);
  });

  it("debe rechazar objeto sin password", () => {
    const result = resetPasswordSchema.safeParse({
      token: "abc-123",
    });
    expect(result.success).toBe(false);
  });
});
