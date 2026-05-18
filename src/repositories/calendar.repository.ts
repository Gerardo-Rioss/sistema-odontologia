import type { CalendarConnection } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";
import type { IRepository } from "./base.repository";

/**
 * Repository for the CalendarConnection entity.
 * Handles token encryption/decryption transparently.
 * All stored tokens are encrypted at rest via AES-256-GCM.
 */
export class CalendarConnectionRepository
  implements IRepository<CalendarConnection>
{
  // ─── Base CRUD ──────────────────────────────────────────────

  async findById(id: string): Promise<CalendarConnection | null> {
    const record = await prisma.calendarConnection.findUnique({
      where: { id },
    });
    return record ? this.decryptTokens(record) : null;
  }

  async findAll(params?: {
    skip?: number;
    take?: number;
  }): Promise<CalendarConnection[]> {
    const records = await prisma.calendarConnection.findMany({
      skip: params?.skip,
      take: params?.take,
      orderBy: { createdAt: "desc" },
    });
    return records.map((r) => this.decryptTokens(r));
  }

  async create(
    data: Partial<CalendarConnection>
  ): Promise<CalendarConnection> {
    return prisma.calendarConnection.create({
      data: {
        userId: data.userId!,
        accessToken: encrypt(data.accessToken!),
        refreshToken: encrypt(data.refreshToken!),
        tokenExpiry: data.tokenExpiry!,
        googleCalendarId: data.googleCalendarId ?? "primary",
        googleEmail: data.googleEmail ?? null,
        status: data.status ?? "ACTIVE",
        googleChannelId: data.googleChannelId ?? null,
        googleResourceId: data.googleResourceId ?? null,
        lastSyncedAt: data.lastSyncedAt ?? null,
      },
    });
  }

  async update(
    id: string,
    data: Partial<CalendarConnection>
  ): Promise<CalendarConnection> {
    // Encrypt tokens if they are being updated
    const updateData: Record<string, unknown> = { ...data };
    if (data.accessToken) {
      updateData.accessToken = encrypt(data.accessToken);
    }
    if (data.refreshToken) {
      updateData.refreshToken = encrypt(data.refreshToken);
    }

    const record = await prisma.calendarConnection.update({
      where: { id },
      data: updateData,
    });
    return this.decryptTokens(record);
  }

  async delete(id: string): Promise<void> {
    await prisma.calendarConnection.delete({ where: { id } });
  }

  // ─── Domain Methods ──────────────────────────────────────────

  /**
   * Finds the active CalendarConnection for a given user.
   * Returns null if no connection exists or the connection is not active.
   */
  async findByUserId(userId: string): Promise<CalendarConnection | null> {
    const record = await prisma.calendarConnection.findUnique({
      where: { userId },
    });
    return record ? this.decryptTokens(record) : null;
  }

  /**
   * Upserts token data for a user. Creates if not exists, updates if exists.
   * Encrypts tokens before storing. Used by the OAuth callback flow.
   */
  async upsertTokens(
    userId: string,
    data: {
      accessToken: string;
      refreshToken: string;
      tokenExpiry: Date;
      googleEmail?: string | null;
      googleCalendarId?: string;
    }
  ): Promise<CalendarConnection> {
    const encryptedAccess = encrypt(data.accessToken);
    const encryptedRefresh = encrypt(data.refreshToken);

    const record = await prisma.calendarConnection.upsert({
      where: { userId },
      create: {
        userId,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        tokenExpiry: data.tokenExpiry,
        googleCalendarId: data.googleCalendarId ?? "primary",
        googleEmail: data.googleEmail ?? null,
        status: "ACTIVE",
      },
      update: {
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        tokenExpiry: data.tokenExpiry,
        googleEmail: data.googleEmail ?? null,
        googleCalendarId: data.googleCalendarId ?? "primary",
        status: "ACTIVE",
      },
    });

    return this.decryptTokens(record);
  }

  /**
   * Updates only the `lastSyncedAt` timestamp for a user's connection.
   * Does not touch tokens or any other field.
   */
  async updateLastSyncedAt(
    userId: string,
    lastSyncedAt: Date = new Date()
  ): Promise<CalendarConnection | null> {
    const record = await prisma.calendarConnection.update({
      where: { userId },
      data: { lastSyncedAt },
    });
    return this.decryptTokens(record);
  }

  /**
   * Updates the connection status (e.g. to REVOKED or EXPIRED).
   */
  async updateStatus(
    userId: string,
    status: CalendarConnection["status"]
  ): Promise<CalendarConnection | null> {
    const record = await prisma.calendarConnection.update({
      where: { userId },
      data: { status },
    });
    return this.decryptTokens(record);
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private decryptTokens(
    record: CalendarConnection
  ): CalendarConnection {
    return {
      ...record,
      accessToken: decrypt(record.accessToken),
      refreshToken: decrypt(record.refreshToken),
    };
  }
}

/** Singleton instance of the calendar connection repository. */
export const calendarRepository = new CalendarConnectionRepository();
