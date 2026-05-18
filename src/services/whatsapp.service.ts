/**
 * WhatsApp Service — business logic for WhatsApp messaging.
 *
 * Orchestrates: Meta Cloud API calls, message persistence,
 * conversation state management, patient lookup/auto-creation,
 * and available-slot computation.
 */
import { prisma } from "@/lib/prisma";
import {
  sendTextMessage,
  sendTemplateMessage,
  sendInteractiveList,
  markMessageAsRead,
} from "@/lib/whatsapp/client";
import type { WhatsAppClientResponse } from "@/lib/whatsapp/client";
import { patientRepository } from "@/repositories/patient.repository";
import { appointmentRepository } from "@/repositories/appointment.repository";
import type {
  WhatsAppWebhookPayload,
  WhatsAppInboundMessage,
  ConversationState,
  ConversationContext,
  AvailableSlot,
  Patient,
} from "@/types";
import type {
  ConversationState as PrismaConversationState,
  Prisma,
} from "@prisma/client";

// ─── Constants ────────────────────────────────────────────────

/** TTL for conversation state in minutes. */
const CONVERSATION_TTL_MINUTES = 5;

/** Business hours (inclusive start, exclusive end). */
const BUSINESS_HOURS_START = 8; // 8:00
const BUSINESS_HOURS_END = 18; // 18:00
const LUNCH_HOUR_START = 13; // 13:00-14:00 blocked

// ─── Helpers ──────────────────────────────────────────────────

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

/**
 * Converts and validates a Prisma ConversationState to our domain type.
 * Returns the domain-typed ConversationState, casting context to ConversationContext.
 */
function toConversationState(
  record: PrismaConversationState
): ConversationState {
  return {
    id: record.id,
    phoneNumber: record.phoneNumber,
    currentState: record.currentState,
    context: record.context as ConversationContext,
    expiresAt: record.expiresAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

// ─── Service ──────────────────────────────────────────────────

export class WhatsAppService {
  // ─── Incoming message processing ────────────────────────────

  /**
   * Parses a Meta webhook payload and persists the inbound message.
   *
   * @returns extracted phoneNumber, messageText, and messageId
   * @throws if the payload has no valid message entry
   */
  async processIncomingMessage(webhookPayload: WhatsAppWebhookPayload): Promise<{
    phoneNumber: string;
    messageText: string;
    messageId: string;
  }> {
    const entry = webhookPayload.entry?.[0];
    if (!entry) {
      throw new Error("Invalid webhook payload: no entry found");
    }

    const change = entry.changes?.[0];
    if (!change?.value) {
      throw new Error("Invalid webhook payload: no change value found");
    }

    const messages = change.value.messages;
    if (!messages || messages.length === 0) {
      throw new Error(
        "No messages in webhook payload (status update or non-message event)"
      );
    }

    const msg: WhatsAppInboundMessage = messages[0];
    const phoneNumber = msg.from;
    const messageText = msg.text?.body ?? "";
    const messageId = msg.id;

    // Persist inbound message
    await prisma.whatsAppMessage.create({
      data: {
        waMessageId: messageId,
        phoneNumber,
        body: messageText,
        direction: "INBOUND",
        messageType: "TEXT",
      },
    });

    return { phoneNumber, messageText, messageId };
  }

  // ─── Outbound messaging ─────────────────────────────────────

  /**
   * Sends a text message via Meta Cloud API and persists the outgoing record.
   */
  async sendMessage(
    phoneNumber: string,
    text: string
  ): Promise<WhatsAppClientResponse> {
    const result = await sendTextMessage(phoneNumber, text);

    // Persist outgoing message regardless of success (for audit trail)
    await prisma.whatsAppMessage.create({
      data: {
        waMessageId: result.messageId || `failed-${Date.now()}`,
        phoneNumber,
        body: text,
        direction: "OUTBOUND",
        messageType: "TEXT",
      },
    });

    return result;
  }

  /**
   * Sends a pre-approved template message and persists the outgoing record.
   */
  async sendTemplate(
    phoneNumber: string,
    templateName: string,
    languageCode = "es"
  ): Promise<WhatsAppClientResponse> {
    const result = await sendTemplateMessage(
      phoneNumber,
      templateName,
      languageCode
    );

    await prisma.whatsAppMessage.create({
      data: {
        waMessageId: result.messageId || `failed-${Date.now()}`,
        phoneNumber,
        body: `[Template: ${templateName}]`,
        direction: "OUTBOUND",
        messageType: "TEMPLATE",
        templateName,
      },
    });

    return result;
  }

  /**
   * Sends an interactive list picker and persists the outgoing record.
   */
  async sendInteractiveList(
    phoneNumber: string,
    header: string,
    body: string,
    button: string,
    sections: { title: string; rows: { id: string; title: string; description?: string }[] }[]
  ): Promise<WhatsAppClientResponse> {
    const result = await sendInteractiveList(
      phoneNumber,
      header,
      body,
      button,
      sections
    );

    await prisma.whatsAppMessage.create({
      data: {
        waMessageId: result.messageId || `failed-${Date.now()}`,
        phoneNumber,
        body: `[Interactive List]: ${body}`,
        direction: "OUTBOUND",
        messageType: "INTERACTIVE",
      },
    });

    return result;
  }

  // ─── Read receipts ──────────────────────────────────────────

  /**
   * Marks an incoming message as read on WhatsApp.
   */
  async markAsRead(messageId: string): Promise<WhatsAppClientResponse> {
    return markMessageAsRead(messageId);
  }

  // ─── Conversation state management ───────────────────────────

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
    const state = await prisma.conversationState.findFirst({
      where: { phoneNumber },
      orderBy: { updatedAt: "desc" },
    });

    if (!state) return null;

    // Check expiry
    if (state.expiresAt && new Date() > state.expiresAt) {
      // Expired — clean up
      await prisma.conversationState.delete({ where: { id: state.id } });
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

    const existing = await prisma.conversationState.findFirst({
      where: { phoneNumber },
      orderBy: { updatedAt: "desc" },
    });

    let record: PrismaConversationState;

    if (existing) {
      const mergedContext = {
        ...(existing.context as ConversationContext),
        ...(context ?? {}),
      };

      record = await prisma.conversationState.update({
        where: { id: existing.id },
        data: {
          currentState: stateValue as PrismaConversationState["currentState"],
          context: mergedContext as Prisma.InputJsonValue,
          expiresAt,
        },
      });
    } else {
      record = await prisma.conversationState.create({
        data: {
          phoneNumber,
          currentState: stateValue as PrismaConversationState["currentState"],
          context: (context ?? {}) as Prisma.InputJsonValue,
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
    await prisma.conversationState.deleteMany({
      where: { phoneNumber },
    });
  }

  // ─── Patient lookup / auto-creation ─────────────────────────

  /**
   * Finds a patient by phone number. If none exists, auto-creates one
   * using the phone number as a placeholder name.
   *
   * The patient will belong to the dentist configured via DENTIST_USER_ID.
   *
   * @returns the existing or newly created Patient
   * @throws if DENTIST_USER_ID is not configured
   */
  async getPatientByPhone(phoneNumber: string): Promise<Patient> {
    const dentistUserId = process.env.DENTIST_USER_ID;
    if (!dentistUserId) {
      throw new Error("DENTIST_USER_ID is not configured");
    }

    // Try to find existing patient
    const existing = await prisma.patient.findFirst({
      where: { phone: phoneNumber },
    });

    if (existing) {
      return {
        id: existing.id,
        name: existing.name,
        email: existing.email,
        phone: existing.phone,
        birthDate: existing.birthDate,
        notes: existing.notes,
        userId: existing.userId,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt,
      };
    }

    // Auto-create with phone as placeholder name using the repository
    const created = await patientRepository.create({
      name: phoneNumber, // placeholder — patient can update later
      phone: phoneNumber,
      userId: dentistUserId,
    });

    return {
      id: created.id,
      name: created.name,
      email: created.email,
      phone: created.phone,
      birthDate: created.birthDate,
      notes: created.notes,
      userId: created.userId,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }

  // ─── Available slots ────────────────────────────────────────

  /**
   * Computes free 1-hour appointment slots for a given date and dentist.
   *
   * Business hours: 8:00–18:00. Lunch block (13:00–14:00) is excluded.
   * Active appointments (PENDING, CONFIRMED) block their time slot.
   * CANCELLED appointments free their slot.
   *
   * @param date — ISO date string (YYYY-MM-DD)
   * @param userId — the dentist's user ID
   * @returns list of available time slots
   */
  async getAvailableSlots(
    date: string,
    userId: string
  ): Promise<AvailableSlot[]> {
    // Query appointments for this dentist via repository
    const appointments = await appointmentRepository.findByDentist(userId);

    // Filter to target date, excluding CANCELLED
    const bookedTimes = new Set(
      appointments
        .filter(
          (a) =>
            a.date.toISOString().slice(0, 10) === date &&
            a.status !== "CANCELLED"
        )
        .map((a) => a.time)
    );

    const slots: AvailableSlot[] = [];

    for (let hour = BUSINESS_HOURS_START; hour < BUSINESS_HOURS_END; hour++) {
      // Skip lunch hour
      if (hour === LUNCH_HOUR_START) continue;

      const time = `${hour.toString().padStart(2, "0")}:00`;
      slots.push({
        time,
        available: !bookedTimes.has(time),
      });
    }

    return slots;
  }
}

/** Singleton instance of the WhatsApp service. */
export const whatsappService = new WhatsAppService();
