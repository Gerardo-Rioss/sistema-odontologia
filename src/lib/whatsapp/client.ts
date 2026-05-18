/**
 * WhatsApp Cloud API HTTP Client (Meta v22.0).
 *
 * Low-level wrapper around the Meta Graph API messages endpoint.
 * All methods return { success, messageId?, error? } — no throws.
 */

const WHATSAPP_API_VERSION = "v22.0";
const WHATSAPP_BASE_URL = "https://graph.facebook.com";

// ─── Response types ───────────────────────────────────────────

export interface WhatsAppClientResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface InteractiveRow {
  id: string;
  title: string;
  description?: string;
}

interface InteractiveSection {
  title: string;
  rows: InteractiveRow[];
}

// ─── Internal helpers ─────────────────────────────────────────

function getApiUrl(): string {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!phoneNumberId) {
    throw new Error("WHATSAPP_PHONE_NUMBER_ID is not configured");
  }
  return `${WHATSAPP_BASE_URL}/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`;
}

function getAuthHeaders(): Record<string, string> {
  const token = process.env.WHATSAPP_TOKEN;
  if (!token) {
    throw new Error("WHATSAPP_TOKEN is not configured");
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

const MAX_RETRIES = 1; // retry once on server errors

async function makeRequest(
  body: Record<string, unknown>,
  attempt = 0
): Promise<WhatsAppClientResponse> {
  let url: string;
  try {
    url = getApiUrl();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "WhatsApp credentials not configured",
    };
  }

  let headers: Record<string, string>;
  try {
    headers = getAuthHeaders();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "WhatsApp credentials not configured",
    };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage =
        data.error?.message ||
        data.error?.error_user_msg ||
        `Meta API returned HTTP ${response.status}`;
      console.error("[WhatsAppClient] Meta API error:", JSON.stringify(data.error || data));

      // Retry once on server errors (5xx)
      if (response.status >= 500 && attempt < MAX_RETRIES) {
        console.warn(`[WhatsAppClient] Retrying request (attempt ${attempt + 1})...`);
        return makeRequest(body, attempt + 1);
      }

      return { success: false, error: errorMessage };
    }

    return {
      success: true,
      messageId: data.messages?.[0]?.id || "",
    };
  } catch (error) {
    console.error("[WhatsAppClient] Request failed:", error);

    // Retry once on network errors
    if (attempt < MAX_RETRIES) {
      console.warn(`[WhatsAppClient] Retrying request (attempt ${attempt + 1})...`);
      return makeRequest(body, attempt + 1);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown network error",
    };
  }
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Sends a plain text message to a WhatsApp recipient.
 */
export async function sendTextMessage(
  phoneNumber: string,
  message: string
): Promise<WhatsAppClientResponse> {
  return makeRequest({
    messaging_product: "whatsapp",
    to: phoneNumber,
    type: "text",
    text: { body: message },
  });
}

/**
 * Sends a pre-approved template message to a WhatsApp recipient.
 *
 * @param languageCode — ISO 639-1 language code (default: "es")
 */
export async function sendTemplateMessage(
  phoneNumber: string,
  templateName: string,
  languageCode = "es"
): Promise<WhatsAppClientResponse> {
  return makeRequest({
    messaging_product: "whatsapp",
    to: phoneNumber,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
    },
  });
}

/**
 * Sends an interactive list picker message.
 *
 * The user sees a list of options and can tap one to reply.
 *
 * @param sections — each section has a title and rows (max 10 rows per section)
 */
export async function sendInteractiveList(
  phoneNumber: string,
  header: string,
  body: string,
  button: string,
  sections: InteractiveSection[]
): Promise<WhatsAppClientResponse> {
  return makeRequest({
    messaging_product: "whatsapp",
    to: phoneNumber,
    type: "interactive",
    interactive: {
      type: "list",
      header: { type: "text", text: header },
      body: { text: body },
      action: {
        button,
        sections,
      },
    },
  });
}

/**
 * Marks an incoming WhatsApp message as read.
 *
 * Sends a read receipt so the sender sees the double-blue checkmark.
 */
export async function markMessageAsRead(
  messageId: string
): Promise<WhatsAppClientResponse> {
  return makeRequest({
    messaging_product: "whatsapp",
    status: "read",
    message_id: messageId,
  });
}
