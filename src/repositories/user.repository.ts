import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { IRepository } from "./base.repository";

/**
 * Repositorio para la entidad User.
 * Extiende las operaciones CRUD base con búsqueda por email.
 */
export class UserRepository implements IRepository<User> {
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  async findAll(params?: {
    skip?: number;
    take?: number;
  }): Promise<User[]> {
    return prisma.user.findMany({
      skip: params?.skip,
      take: params?.take,
      orderBy: { createdAt: "desc" },
    });
  }

  async create(data: Partial<User>): Promise<User> {
    return prisma.user.create({
      data: {
        email: data.email!,
        password: data.password!,
        firstName: data.firstName!,
        lastName: data.lastName!,
        role: data.role ?? "DENTIST",
        emailVerified: data.emailVerified ?? null,
      },
    });
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.user.delete({ where: { id } });
  }
}

/** Instancia singleton del repositorio de usuarios. */
export const userRepository = new UserRepository();
