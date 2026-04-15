import axios from 'axios';
import crypto from 'crypto';
import { ENV } from '../config/env.js';

const WHATSAPP_API_BASE = `https://graph.facebook.com/v21.0/${ENV.WHATSAPP_PHONE_NUMBER_ID}`;

/**
 * Send a plain text message to a WhatsApp number.
 */
export const sendTextMessage = async (to: string, body: string): Promise<string> => {
  const res = await axios.post(
    `${WHATSAPP_API_BASE}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
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
};

/**
 * Send a template message (for messages outside the 24h window).
 */
export const sendTemplateMessage = async (
  to: string,
  templateName: string,
  languageCode: string = 'en',
  components: any[] = []
): Promise<string> => {
  const res = await axios.post(
    `${WHATSAPP_API_BASE}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
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
};

/**
 * Send an interactive button message.
 */
export const sendButtonMessage = async (
  to: string,
  bodyText: string,
  buttons: { id: string; title: string }[]
): Promise<string> => {
  const res = await axios.post(
    `${WHATSAPP_API_BASE}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
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
};

/**
 * Validate the X-Hub-Signature-256 header from Meta webhook POSTs.
 */
export const validateWebhookSignature = (
  rawBody: Buffer,
  signature: string
): boolean => {
  const expectedSig =
    'sha256=' +
    crypto
      .createHmac('sha256', ENV.WHATSAPP_API_KEY)
      .update(rawBody)
      .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expectedSig),
    Buffer.from(signature)
  );
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
