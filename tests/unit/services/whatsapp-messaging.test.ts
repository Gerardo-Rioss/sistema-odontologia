/**
 * Unit tests for WhatsAppMessagingService.
 *
 * Tests:
 *  - processIncomingMessage parses valid payload
 *  - processIncomingMessage throws on empty entry
 *  - processIncomingMessage throws on no messages
 *  - processIncomingMessage extracts interactive reply ID
 *  - sendMessage persists outbound record
 *  - sendTemplate persists template record
 *  - sendInteractiveList persists interactive record
 *  - markAsRead delegates to client
 */
import { WhatsAppMessagingService } from "@/services/whatsapp-messaging.service";

// ─── Mock IWhatsAppClient ────────────────────────────────────

function makeMockClient() {
  return {
    sendTextMessage: jest.fn(),
    sendTemplateMessage: jest.fn(),
    sendInteractiveList: jest.fn(),
    markMessageAsRead: jest.fn(),
  };
}

// ─── Mock Prisma ─────────────────────────────────────────────

function makeMockPrisma() {
  return {
    whatsAppMessage: {
      create: jest.fn(),
    },
  };
}

// ─── Helpers ─────────────────────────────────────────────────

function makeWebhookPayload(overrides: Record<string, unknown> = {}) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "entry-1",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "+541155551234",
                phone_number_id: "phone-id-1",
              },
              messages: [
                {
                  from: "+5491155551234",
                  id: "msg-123",
                  timestamp: "1234567890",
                  text: { body: "Hola" },
                  type: "text",
                },
              ],
            },
            field: "messages",
          },
        ],
      },
    ],
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────

describe("WhatsAppMessagingService", () => {
  let prisma: ReturnType<typeof makeMockPrisma>;
  let client: ReturnType<typeof makeMockClient>;
  let service: WhatsAppMessagingService;

  beforeEach(() => {
    prisma = makeMockPrisma();
    client = makeMockClient();
    service = new WhatsAppMessagingService(
      prisma as never,
      client as never
    );
    jest.clearAllMocks();
  });

  describe("processIncomingMessage", () => {
    it("should parse a valid webhook payload and persist inbound message", async () => {
      (prisma.whatsAppMessage.create as jest.Mock).mockResolvedValue({});

      const result = await service.processIncomingMessage(makeWebhookPayload());

      expect(result.phoneNumber).toBe("+5491155551234");
      expect(result.messageText).toBe("Hola");
      expect(result.messageId).toBe("msg-123");
      expect(prisma.whatsAppMessage.create).toHaveBeenCalledWith({
        data: {
          waMessageId: "msg-123",
          phoneNumber: "+5491155551234",
          body: "Hola",
          direction: "INBOUND",
          messageType: "TEXT",
        },
      });
    });

    it("should throw when entry is missing", async () => {
      const payload = makeWebhookPayload({ entry: undefined });

      await expect(service.processIncomingMessage(payload)).rejects.toThrow(
        "Invalid webhook payload: no entry found"
      );
    });

    it("should throw when change value is missing", async () => {
      const payload = makeWebhookPayload({
        entry: [{ id: "e1", changes: [{}] }],
      });

      await expect(service.processIncomingMessage(payload)).rejects.toThrow(
        "Invalid webhook payload: no change value found"
      );
    });

    it("should throw when no messages in payload", async () => {
      const payload = makeWebhookPayload({
        entry: [
          {
            id: "e1",
            changes: [{ value: { messages: [] }, field: "messages" }],
          },
        ],
      });

      await expect(service.processIncomingMessage(payload)).rejects.toThrow(
        "No messages in webhook payload"
      );
    });

    it("should extract interactive list reply ID as message text", async () => {
      (prisma.whatsAppMessage.create as jest.Mock).mockResolvedValue({});
      const payload = makeWebhookPayload({
        entry: [
          {
            id: "e1",
            changes: [
              {
                value: {
                  messages: [
                    {
                      from: "+5491155551234",
                      id: "msg-456",
                      interactive: {
                        type: "list",
                        list_reply: { id: "limpieza", title: "Limpieza dental" },
                      },
                      type: "interactive",
                    },
                  ],
                },
                field: "messages",
              },
            ],
          },
        ],
      });

      const result = await service.processIncomingMessage(payload);

      expect(result.messageText).toBe("limpieza");
    });
  });

  describe("sendMessage", () => {
    it("should send text and persist outbound record", async () => {
      (client.sendTextMessage as jest.Mock).mockResolvedValue({
        success: true,
        messageId: "wa-msg-1",
      });
      (prisma.whatsAppMessage.create as jest.Mock).mockResolvedValue({});

      const result = await service.sendMessage("+5491155551234", "Hello");

      expect(client.sendTextMessage).toHaveBeenCalledWith(
        "+5491155551234",
        "Hello"
      );
      expect(result.success).toBe(true);
      expect(prisma.whatsAppMessage.create).toHaveBeenCalledWith({
        data: {
          waMessageId: "wa-msg-1",
          phoneNumber: "+5491155551234",
          body: "Hello",
          direction: "OUTBOUND",
          messageType: "TEXT",
        },
      });
    });

    it("should persist failed message with fallback ID", async () => {
      (client.sendTextMessage as jest.Mock).mockResolvedValue({
        success: false,
        error: "Rate limited",
      });
      (prisma.whatsAppMessage.create as jest.Mock).mockResolvedValue({});

      const result = await service.sendMessage("+5491155551234", "Hello");

      expect(result.success).toBe(false);
      expect(prisma.whatsAppMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            waMessageId: expect.stringContaining("failed-"),
          }),
        })
      );
    });
  });

  describe("sendTemplate", () => {
    it("should send template and persist record with templateName", async () => {
      (client.sendTemplateMessage as jest.Mock).mockResolvedValue({
        success: true,
        messageId: "wa-tpl-1",
      });
      (prisma.whatsAppMessage.create as jest.Mock).mockResolvedValue({});

      const result = await service.sendTemplate(
        "+5491155551234",
        "recordatorio_24h"
      );

      expect(result.success).toBe(true);
      expect(prisma.whatsAppMessage.create).toHaveBeenCalledWith({
        data: {
          waMessageId: "wa-tpl-1",
          phoneNumber: "+5491155551234",
          body: "[Template: recordatorio_24h]",
          direction: "OUTBOUND",
          messageType: "TEMPLATE",
          templateName: "recordatorio_24h",
        },
      });
    });
  });

  describe("sendInteractiveList", () => {
    it("should send interactive list and persist record", async () => {
      (client.sendInteractiveList as jest.Mock).mockResolvedValue({
        success: true,
        messageId: "wa-int-1",
      });
      (prisma.whatsAppMessage.create as jest.Mock).mockResolvedValue({});

      const sections = [
        {
          title: "Tipos",
          rows: [{ id: "a", title: "Option A" }],
        },
      ];

      const result = await service.sendInteractiveList(
        "+5491155551234",
        "Header",
        "Pick one",
        "Ver",
        sections
      );

      expect(result.success).toBe(true);
      expect(prisma.whatsAppMessage.create).toHaveBeenCalledWith({
        data: {
          waMessageId: "wa-int-1",
          phoneNumber: "+5491155551234",
          body: "[Interactive List]: Pick one",
          direction: "OUTBOUND",
          messageType: "INTERACTIVE",
        },
      });
    });
  });

  describe("markAsRead", () => {
    it("should delegate to client markMessageAsRead", async () => {
      (client.markMessageAsRead as jest.Mock).mockResolvedValue({
        success: true,
      });

      const result = await service.markAsRead("msg-123");

      expect(client.markMessageAsRead).toHaveBeenCalledWith("msg-123");
      expect(result.success).toBe(true);
    });
  });
});
