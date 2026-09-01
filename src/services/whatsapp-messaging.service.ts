/**
 * WhatsApp Messaging Service — Meta Cloud API calls and message persistence.
 *
 * Extracted from WhatsAppService. Handles outbound/inbound messaging
 * and read receipts.
 */
import { prisma } from "@/lib/prisma";
import {
  sendTextMessage,
  sendTemplateMessage,
  sendInteractiveList,
  markMessageAsRead,
} from "@/lib/whatsapp/client";
import type { WhatsAppClientResponse } from "@/lib/whatsapp/client";
import type {
  WhatsAppWebhookPayload,
  WhatsAppInboundMessage,
} from "@/types";
import type { IWhatsAppClient } from "./types";

// ─── Service ──────────────────────────────────────────────────

export class WhatsAppMessagingService {
  constructor(
    private readonly prisma: {
      whatsAppMessage: {
        create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
      };
    },
    private readonly client: IWhatsAppClient
  ) {}

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

    // Extract text from plain text messages or interactive reply IDs
    let messageText = msg.text?.body ?? "";

    if (!messageText && msg.interactive) {
      const interactive = msg.interactive as Record<string, unknown>;
      const listReply = interactive.list_reply as
        | { id: string; title?: string }
        | undefined;
      const buttonReply = interactive.button_reply as
        | { id: string; title?: string }
        | undefined;
      messageText = listReply?.id ?? buttonReply?.id ?? "";
    }

    const messageId = msg.id;

    // Persist inbound message
    await this.prisma.whatsAppMessage.create({
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
    const result = await this.client.sendTextMessage(phoneNumber, text);

    // Persist outgoing message regardless of success (for audit trail)
    await this.prisma.whatsAppMessage.create({
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
    const result = await this.client.sendTemplateMessage(
      phoneNumber,
      templateName,
      languageCode
    );

    await this.prisma.whatsAppMessage.create({
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
    const result = await this.client.sendInteractiveList(
      phoneNumber,
      header,
      body,
      button,
      sections
    );

    await this.prisma.whatsAppMessage.create({
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
    return this.client.markMessageAsRead(messageId);
  }
}

/** Singleton instance of the WhatsApp messaging service. */
export const whatsappMessaging = new WhatsAppMessagingService(
  prisma as unknown as WhatsAppMessagingService["prisma"],
  { sendTextMessage, sendTemplateMessage, sendInteractiveList, markMessageAsRead }
);
