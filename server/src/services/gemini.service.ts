import { GoogleGenAI } from '@google/genai';
import { ENV } from '../config/env.js';

// Cache client at module level — never instantiate per request (per skill spec)
const genai = new GoogleGenAI({ apiKey: ENV.GEMINI_API_KEY });

// Static fallback when Gemini quota is exceeded
const FALLBACK_TEMPLATES = {
  en: (name: string, days: number, amount: number, link: string, outstanding: number) =>
    outstanding > 0
      ? `Hi ${name}, your gym plan expires in ${days} day(s). Total due: ₹${amount} (includes ₹${outstanding} previous). Renew: ${link}`
      : `Hi ${name}, your gym plan expires in ${days} day(s). Renew now (₹${amount}): ${link}`,
  hi: (name: string, days: number, amount: number, link: string, outstanding: number) =>
    outstanding > 0
      ? `${name} ji, aapka gym plan ${days} din mein khatam. Total: ₹${amount} (₹${outstanding} pichla baaki). Renew: ${link}`
      : `${name} ji, aapka gym plan ${days} din mein khatam ho raha hai. ₹${amount} — Renew: ${link}`,
};

interface ReminderInput {
  memberName: string;
  gymName: string;
  daysRemaining: number;
  planAmount: number;
  paymentLink: string;
  language: 'en' | 'hi' | 'hinglish';
  outstandingBalance?: number;
}

/**
 * Generate a polite, <160 char WhatsApp reminder using Gemini 1.5 Flash.
 * Now includes outstanding balance context if present.
 * Falls back to a static template if Gemini is unavailable / quota exceeded.
 */
export const generateReminder = async (input: ReminderInput): Promise<string> => {
  const { memberName, gymName, daysRemaining, planAmount, paymentLink, language, outstandingBalance = 0 } = input;

  const langInstruction =
    language === 'hi'
      ? 'Respond entirely in Hindi (Devanagari script).'
      : language === 'hinglish'
        ? 'Respond in Hinglish (Hindi words written in English script).'
        : 'Respond in English.';

  const balanceContext = outstandingBalance > 0
    ? `- Previous outstanding balance: ₹${outstandingBalance} (already included in total amount)`
    : '';

  const prompt = `You are a polite gym assistant for "${gymName}" in Delhi.
Generate a short WhatsApp reminder message for a gym member.

Details:
- Member name: ${memberName}
- Days remaining on plan: ${daysRemaining}
- Total renewal amount: ₹${planAmount}
${balanceContext}
- Payment link: ${paymentLink}

Rules:
- ${langInstruction}
- Keep the message UNDER 160 characters total.
- Be polite and friendly — never threatening. Think local Delhi RWA tone.
${outstandingBalance > 0 ? '- Mention previous dues gently (e.g., "includes previous balance").' : ''}
- Include the payment link at the end.
- Output ONLY the message text, nothing else.`;

  try {
    const response = await genai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
    });

    const text = response.text?.trim();
    if (text && text.length <= 200) {
      return text;
    }
    // If Gemini returned something too long, fall back
    return FALLBACK_TEMPLATES[language === 'hinglish' ? 'hi' : language](
      memberName, daysRemaining, planAmount, paymentLink, outstandingBalance
    );
  } catch (error) {
    // Quota exceeded or API error — use static fallback
    console.error('Gemini API error, using fallback:', error);
    return FALLBACK_TEMPLATES[language === 'hinglish' ? 'hi' : language](
      memberName, daysRemaining, planAmount, paymentLink, outstandingBalance
    );
  }
};
