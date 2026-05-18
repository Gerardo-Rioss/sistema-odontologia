/**
 * Tests unitarios para AuthService.
 *
 * Cubre los escenarios de spec/user-auth:
 *  - Registro exitoso, email duplicado
 *  - Login: credenciales correctas, contraseña incorrecta, email no existe
 *  - Recuperación: token válido, token expirado, token ya usado, email no existe
 *
 * NOTA: Prisma + bcrypt están mockeados. Estos tests compilan y type-checkean
 * pero no se ejecutan (TDD deshabilitado en este proyecto).
 */

import { AuthService } from "@/services/auth.service";
import { userRepository } from "@/repositories/user.repository";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { User as PrismaUser } from "@prisma/client";

// ─── Mocks ────────────────────────────────────────────────────

jest.mock("@/repositories/user.repository");
jest.mock("@/lib/prisma", () => ({
  prisma: {
    passwordResetToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));
jest.mock("bcryptjs");

const mockUserRepo = userRepository as jest.Mocked<typeof userRepository>;
const mockPrisma = prisma as unknown as {
  passwordResetToken: {
    create: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  $transaction: jest.Mock;
};
const mockBcrypt = bcrypt as unknown as {
  hash: jest.Mock;
  compare: jest.Mock;
};

// ─── Helpers ──────────────────────────────────────────────────

function makePrismaUser(overrides: Partial<PrismaUser> = {}): PrismaUser {
  return {
    id: "user-1",
    email: "test@example.com",
    password: "$2a$12$hashedpasswordhere",
    firstName: "Juan",
    lastName: "Pérez",
    name: null,
    role: "DENTIST",
    emailVerified: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

describe("AuthService — registerUser", () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService();
    jest.clearAllMocks();
  });

  it("debe registrar un usuario exitosamente con datos válidos", async () => {
    // GIVEN: email no existe, bcrypt hashea correctamente
    mockUserRepo.findByEmail.mockResolvedValue(null);
    mockBcrypt.hash.mockResolvedValue("$2a$12$hashed" as never);
    mockUserRepo.create.mockResolvedValue(makePrismaUser());

    const result = await service.registerUser({
      email: "new@example.com",
      password: "Test1234",
      firstName: "María",
      lastName: "García",
    });

    // THEN: usuario creado sin password expuesto
    expect(result).toBeDefined();
    expect(result.email).toBe("test@example.com");
    expect(result.firstName).toBe("Juan");
    expect(result.lastName).toBe("Pérez");
    // Verificar que bcrypt.hash fue llamado con cost 12
    expect(mockBcrypt.hash).toHaveBeenCalledWith("Test1234", 12);
    expect(mockUserRepo.create).toHaveBeenCalledTimes(1);
  });

  it("debe lanzar error cuando el email ya está registrado", async () => {
    // GIVEN: email ya existe en la base de datos
    mockUserRepo.findByEmail.mockResolvedValue(makePrismaUser());

    await expect(
      service.registerUser({
        email: "test@example.com",
        password: "Test1234",
        firstName: "Juan",
        lastName: "Pérez",
      })
    ).rejects.toThrow("El correo ya está registrado");

    // THEN: no se llamó a create
    expect(mockUserRepo.create).not.toHaveBeenCalled();
  });
});

describe("AuthService — verifyCredentials", () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService();
    jest.clearAllMocks();
  });

  it("debe retornar SessionUser con credenciales correctas", async () => {
    // GIVEN: usuario existe y contraseña coincide
    const user = makePrismaUser();
    mockUserRepo.findByEmail.mockResolvedValue(user);
    mockBcrypt.compare.mockResolvedValue(true as never);

    const result = await service.verifyCredentials(
      "test@example.com",
      "Test1234"
    );

    expect(result).not.toBeNull();
    expect(result!.email).toBe("test@example.com");
    expect(result!.role).toBe("DENTIST");
  });

  it("debe retornar null con contraseña incorrecta", async () => {
    mockUserRepo.findByEmail.mockResolvedValue(makePrismaUser());
    mockBcrypt.compare.mockResolvedValue(false as never);

    const result = await service.verifyCredentials(
      "test@example.com",
      "WrongPass"
    );

    expect(result).toBeNull();
  });

  it("debe retornar null cuando el email no existe", async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null);

    const result = await service.verifyCredentials(
      "noexiste@example.com",
      "Test1234"
    );

    expect(result).toBeNull();
    // No debe llamar a bcrypt.compare si el usuario no existe
    expect(mockBcrypt.compare).not.toHaveBeenCalled();
  });
});

describe("AuthService — generateResetToken", () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService();
    jest.clearAllMocks();
  });

  it("debe generar y guardar un token para un email registrado", async () => {
    mockUserRepo.findByEmail.mockResolvedValue(makePrismaUser());
    mockPrisma.passwordResetToken.create.mockResolvedValue({
      id: "token-1",
      token: expect.any(String) as unknown as string,
      userId: "user-1",
      expiresAt: new Date(),
      used: false,
      createdAt: new Date(),
    });

    const token = await service.generateResetToken("test@example.com");

    expect(token).not.toBeNull();
    expect(mockPrisma.passwordResetToken.create).toHaveBeenCalledTimes(1);
  });

  it("debe retornar null sin revelar si el email no existe (no enumeración)", async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null);

    const token = await service.generateResetToken("noexiste@example.com");

    expect(token).toBeNull();
    expect(mockPrisma.passwordResetToken.create).not.toHaveBeenCalled();
  });
});

describe("AuthService — resetPassword", () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService();
    jest.clearAllMocks();
  });

  it("debe actualizar la contraseña con un token válido", async () => {
    // GIVEN: token válido, no expirado, no usado
    const futureDate = new Date(Date.now() + 60 * 60 * 1000);
    mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
      id: "token-1",
      token: "abc-123",
      userId: "user-1",
      expiresAt: futureDate,
      used: false,
      createdAt: new Date(),
    });
    mockBcrypt.hash.mockResolvedValue("$2a$12$newhash" as never);
    mockPrisma.$transaction.mockResolvedValue([{}, {}]);

    await expect(
      service.resetPassword("abc-123", "NuevaClave1")
    ).resolves.not.toThrow();

    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it("debe lanzar error con token expirado", async () => {
    const pastDate = new Date(Date.now() - 60 * 60 * 1000);
    mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
      id: "token-1",
      token: "expired-token",
      userId: "user-1",
      expiresAt: pastDate,
      used: false,
      createdAt: new Date(),
    });

    await expect(
      service.resetPassword("expired-token", "NuevaClave1")
    ).rejects.toThrow("Token expirado");
  });

  it("debe lanzar error con token ya utilizado", async () => {
    mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
      id: "token-1",
      token: "used-token",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 3600000),
      used: true,
      createdAt: new Date(),
    });

    await expect(
      service.resetPassword("used-token", "NuevaClave1")
    ).rejects.toThrow("Token ya utilizado");
  });

  it("debe lanzar error con token inexistente", async () => {
    mockPrisma.passwordResetToken.findUnique.mockResolvedValue(null);

    await expect(
      service.resetPassword("no-existe", "NuevaClave1")
    ).rejects.toThrow("Token inválido o expirado");
  });
});

describe("AuthService — changePassword", () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService();
    jest.clearAllMocks();
  });

  it("debe cambiar la contraseña cuando la actual es correcta", async () => {
    mockUserRepo.findById.mockResolvedValue(makePrismaUser());
    mockBcrypt.compare.mockResolvedValue(true as never);
    mockBcrypt.hash.mockResolvedValue("$2a$12$newhash" as never);

    await expect(
      service.changePassword("user-1", "OldPass", "NewPass1!")
    ).resolves.not.toThrow();

    expect(mockUserRepo.update).toHaveBeenCalledWith("user-1", {
      password: "$2a$12$newhash",
    });
  });

  it("debe lanzar error cuando la contraseña actual es incorrecta", async () => {
    mockUserRepo.findById.mockResolvedValue(makePrismaUser());
    mockBcrypt.compare.mockResolvedValue(false as never);

    await expect(
      service.changePassword("user-1", "WrongOld", "NewPass1!")
    ).rejects.toThrow("Contraseña actual incorrecta");
  });

  it("debe lanzar error cuando el usuario no existe", async () => {
    mockUserRepo.findById.mockResolvedValue(null);

    await expect(
      service.changePassword("no-existe", "OldPass", "NewPass1!")
    ).rejects.toThrow("Usuario no encontrado");
  });
});
