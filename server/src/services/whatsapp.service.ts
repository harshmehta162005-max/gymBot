import axios from 'axios';
import crypto from 'crypto';
import { ENV } from '../config/env.js';
import { logger } from '../utils/logger.js';

// Lazy getter — computed at call time so dotenv is guaranteed to have loaded
const getApiBase = () => `https://graph.facebook.com/v21.0/${ENV.WHATSAPP_PHONE_NUMBER_ID}`;

/**
 * Send a plain text message to a WhatsApp number.
 */
export const sendTextMessage = async (to: string, body: string): Promise<string | null> => {
  // Ensure country code prefix for India (Meta requires "91XXXXXXXXXX" format, no + sign)
  const formattedTo = to.startsWith('91') ? to : `91${to}`;
  try {
    const res = await axios.post(
      `${getApiBase()}/messages`,
      {
        messaging_product: 'whatsapp',
        to: formattedTo,
        type: 'text',
        text: { body },
      },
      {
        headers: {
          Authorization: `Bearer ${ENV.WHATSAPP_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return res.data.messages[0].id;
  } catch (error: any) {
    logger.error(`[WhatsApp] Failed to send text to ${to}: ${error.response?.data?.error?.message || error.message}`);
    return null;
  }
};

/**
 * Send a template message (for messages outside the 24h window).
 */
export const sendTemplateMessage = async (
  to: string,
  templateName: string,
  languageCode: string = 'en',
  components: any[] = []
): Promise<string | null> => {
  const formattedTo = to.startsWith('91') ? to : `91${to}`;
  try {
    const res = await axios.post(
      `${getApiBase()}/messages`,
      {
        messaging_product: 'whatsapp',
        to: formattedTo,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${ENV.WHATSAPP_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return res.data.messages[0].id;
  } catch (error: any) {
    logger.error(`[WhatsApp] Failed to send template ${templateName} to ${to}: ${error.response?.data?.error?.message || error.message}`);
    return null;
  }
};

/**
 * Send an interactive button message.
 */
export const sendButtonMessage = async (
  to: string,
  bodyText: string,
  buttons: { id: string; title: string }[]
): Promise<string | null> => {
  const formattedTo = to.startsWith('91') ? to : `91${to}`;
  try {
    const res = await axios.post(
      `${getApiBase()}/messages`,
      {
        messaging_product: 'whatsapp',
        to: formattedTo,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: bodyText },
          action: {
            buttons: buttons.map((b) => ({
              type: 'reply',
              reply: { id: b.id, title: b.title },
            })),
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${ENV.WHATSAPP_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return res.data.messages[0].id;
  } catch (error: any) {
    logger.error(`[WhatsApp] Failed to send buttons to ${to}: ${error.response?.data?.error?.message || error.message}`);
    return null;
  }
};

/**
 * Validate the X-Hub-Signature-256 header from Meta webhook POSTs.
 */
export const validateWebhookSignature = (
  rawBody: Buffer,
  signature: string
): boolean => {
  try {
    const expectedSig =
      'sha256=' +
      crypto
        .createHmac('sha256', ENV.WHATSAPP_APP_SECRET)
        .update(rawBody)
        .digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(expectedSig),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
};

/**
 * Extract messages array from a webhook payload safely.
 * Returns empty array if no messages present (status updates, etc).
 */
export const extractMessages = (body: any): any[] => {
  try {
    return body.entry?.[0]?.changes?.[0]?.value?.messages || [];
  } catch {
    return [];
  }
};
