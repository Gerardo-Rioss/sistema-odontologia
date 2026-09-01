/**
 * Conversation State Service — TTL-based conversation state CRUD.
 *
 * Extracted from WhatsAppService. Manages conversation state
 * for WhatsApp bot interactions with automatic TTL expiry.
 */
import { prisma } from "@/lib/prisma";
import type { ConversationState, ConversationContext } from "@/types";
import type { IConversationStateRepository } from "./types";

// ─── Constants ────────────────────────────────────────────────

/** TTL for conversation state in minutes. */
const CONVERSATION_TTL_MINUTES = 5;

// ─── Helpers ──────────────────────────────────────────────────

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

/**
 * Converts and validates a Prisma ConversationState to our domain type.
 * Returns the domain-typed ConversationState, casting context to ConversationContext.
 */
function toConversationState(
  record: {
    id: string;
    phoneNumber: string;
    currentState: string;
    context: unknown;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }
): ConversationState {
  return {
    id: record.id,
    phoneNumber: record.phoneNumber,
    currentState: record.currentState as ConversationState["currentState"],
    context: record.context as ConversationContext,
    expiresAt: record.expiresAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

// ─── Service ──────────────────────────────────────────────────

export class ConversationStateService {
  constructor(private readonly prisma: IConversationStateRepository) {}

  /**
   * Retrieves the current conversation state for a phone number.
   *
   * Automatically clears expired states (TTL = 5 minutes).
   *
   * @returns the ConversationState or null if none exists / expired
   */
  async getConversationState(
    phoneNumber: string
  ): Promise<ConversationState | null> {
    const state = await this.prisma.findFirst({
      where: { phoneNumber },
      orderBy: { updatedAt: "desc" },
    });

    if (!state) return null;

    // Check expiry
    if (state.expiresAt && new Date() > state.expiresAt) {
      // Expired — clean up
      await this.prisma.delete({ where: { id: state.id } });
      return null;
    }

    return toConversationState(state);
  }

  /**
   * Creates or updates the conversation state for a phone number.
   *
   * The state automatically expires after CONVERSATION_TTL_MINUTES.
   *
   * @param stateValue — the ConversationStateEnum value to set
   * @param context — optional context data to merge with existing
   */
  async saveConversationState(
    phoneNumber: string,
    stateValue: string,
    context?: ConversationContext
  ): Promise<ConversationState> {
    const expiresAt = addMinutes(new Date(), CONVERSATION_TTL_MINUTES);

    const existing = await this.prisma.findFirst({
      where: { phoneNumber },
      orderBy: { updatedAt: "desc" },
    });

    let record: {
      id: string;
      phoneNumber: string;
      currentState: string;
      context: unknown;
      expiresAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    };

    if (existing) {
      const mergedContext = {
        ...(existing.context as ConversationContext),
        ...(context ?? {}),
      };

      record = await this.prisma.update({
        where: { id: existing.id },
        data: {
          currentState: stateValue,
          context: mergedContext,
          expiresAt,
        },
      });
    } else {
      record = await this.prisma.create({
        data: {
          phoneNumber,
          currentState: stateValue,
          context: context ?? {},
          expiresAt,
        },
      });
    }

    return toConversationState(record);
  }

  /**
   * Deletes the conversation state for a phone number.
   */
  async clearConversationState(phoneNumber: string): Promise<void> {
    await this.prisma.deleteMany({
      where: { phoneNumber },
    });
  }
}

/** Singleton instance of the conversation state service. */
export const conversationStateService = new ConversationStateService(
  prisma.conversationState as unknown as IConversationStateRepository
);
