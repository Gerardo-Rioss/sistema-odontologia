import type { User } from "@/types";

/**
 * Servicio de autenticación y gestión de usuarios.
 */
export class AuthService {
  /**
   * Registra un nuevo usuario en el sistema.
   */
  async register(_data: {
    email: string;
    password: string;
    name: string;
  }): Promise<User> {
    throw new Error("AuthService.register() — no implementado aún");
  }

  /**
   * Valida credenciales y retorna el usuario si son correctas.
   */
  async validateCredentials(
    _email: string,
    _password: string
  ): Promise<User | null> {
    throw new Error(
      "AuthService.validateCredentials() — no implementado aún"
    );
  }

  /**
   * Cambia la contraseña de un usuario.
   */
  async changePassword(
    _userId: string,
    _currentPassword: string,
    _newPassword: string
  ): Promise<void> {
    throw new Error("AuthService.changePassword() — no implementado aún");
  }
}
