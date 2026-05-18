import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { userRepository } from "@/repositories/user.repository";
import type { SessionUser, RegisterInput } from "@/types";

/**
 * Servicio de autenticación y gestión de usuarios.
 *
 * Maneja registro, login, y recuperación de contraseña
 * con bcrypt (cost 12) y tokens únicos de un solo uso.
 */
export class AuthService {
  private readonly BCRYPT_COST = 12;
  private readonly RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

  // ─── Registro ──────────────────────────────────────────────

  /**
   * Registra un nuevo usuario en el sistema.
   *
   * @throws {Error} "El correo ya está registrado" si el email existe
   */
  async registerUser(data: RegisterInput): Promise<SessionUser> {
    // Validar duplicado de email
    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      throw new Error("El correo ya está registrado");
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(data.password, this.BCRYPT_COST);

    // Crear usuario
    const user = await userRepository.create({
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      role: "DENTIST",
    });

    // Retornar sin password
    return this.toSessionUser(user);
  }

  // ─── Validación de credenciales ────────────────────────────

  /**
   * Valida credenciales de inicio de sesión.
   *
   * @returns Usuario sin password si las credenciales son correctas, null si no.
   */
  async verifyCredentials(
    email: string,
    password: string
  ): Promise<SessionUser | null> {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return null;
    }

    return this.toSessionUser(user);
  }

  // ─── Recuperación de contraseña ────────────────────────────

  /**
   * Genera un token de recuperación de contraseña para el email dado.
   *
   * No revela si el email existe o no (protección contra enumeración).
   *
   * @returns El token generado, o null si el email no existe.
   */
  async generateResetToken(email: string): Promise<string | null> {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      return null;
    }

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + this.RESET_TOKEN_TTL_MS);

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
        used: false,
      },
    });

    return token;
  }

  /**
   * Restablece la contraseña usando un token de recuperación.
   *
   * @throws {Error} "Token inválido o expirado" si el token no es válido
   * @throws {Error} "Token ya utilizado" si el token ya fue usado
   */
  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<void> {
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      throw new Error("Token inválido o expirado");
    }

    if (resetToken.used) {
      throw new Error("Token ya utilizado");
    }

    if (new Date() > resetToken.expiresAt) {
      throw new Error("Token expirado");
    }

    // Hashear nueva contraseña y actualizar usuario
    const hashedPassword = await bcrypt.hash(newPassword, this.BCRYPT_COST);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
    ]);
  }

  // ─── Cambio de contraseña (usuario autenticado) ────────────

  /**
   * Cambia la contraseña de un usuario autenticado.
   *
   * @throws {Error} "Contraseña actual incorrecta" si la actual no coincide
   * @throws {Error} "Usuario no encontrado" si el userId no existe
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new Error("Contraseña actual incorrecta");
    }

    const hashedPassword = await bcrypt.hash(newPassword, this.BCRYPT_COST);

    await userRepository.update(userId, { password: hashedPassword });
  }

  // ─── Helpers ───────────────────────────────────────────────

  /**
   * Convierte un User de Prisma a SessionUser sin exponer el password.
   */
  private toSessionUser(user: User): SessionUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      emailVerified: user.emailVerified,
    };
  }
}

/** Instancia singleton del servicio de autenticación. */
export const authService = new AuthService();
