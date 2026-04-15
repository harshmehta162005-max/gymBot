import { GoogleGenAI } from '@google/genai';
import { ENV } from '../config/env.js';

// Cache client at module level — never instantiate per request (per skill spec)
const genai = new GoogleGenAI({ apiKey: ENV.GEMINI_API_KEY });

// Static fallback when Gemini quota is exceeded
const FALLBACK_TEMPLATES = {
  en: (name: string, days: number, link: string) =>
    `Hi ${name}, your gym plan expires in ${days} day(s). Renew now: ${link}`,
  hi: (name: string, days: number, link: string) =>
    `${name} ji, aapka gym plan ${days} din mein khatam ho raha hai. Renew karein: ${link}`,
};

interface ReminderInput {
  memberName: string;
  gymName: string;
  daysRemaining: number;
  planAmount: number;
  paymentLink: string;
  language: 'en' | 'hi' | 'hinglish';
}

/**
 * Generate a polite, <160 char WhatsApp reminder using Gemini 1.5 Flash.
 * Falls back to a static template if Gemini is unavailable / quota exceeded.
 */
export const generateReminder = async (input: ReminderInput): Promise<string> => {
  const { memberName, gymName, daysRemaining, planAmount, paymentLink, language } = input;

  const langInstruction =
    language === 'hi'
      ? 'Respond entirely in Hindi (Devanagari script).'
      : language === 'hinglish'
        ? 'Respond in Hinglish (Hindi words written in English script).'
        : 'Respond in English.';

  const prompt = `You are a polite gym assistant for "${gymName}" in Delhi.
Generate a short WhatsApp reminder message for a gym member.

Details:
- Member name: ${memberName}
- Days remaining on plan: ${daysRemaining}
- Plan renewal amount: ₹${planAmount}
- Payment link: ${paymentLink}

Rules:
- ${langInstruction}
- Keep the message UNDER 160 characters total.
- Be polite and friendly — never threatening. Think local Delhi RWA tone.
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
      memberName, daysRemaining, paymentLink
    );
  } catch (error) {
    // Quota exceeded or API error — use static fallback
    console.error('Gemini API error, using fallback:', error);
    return FALLBACK_TEMPLATES[language === 'hinglish' ? 'hi' : language](
      memberName, daysRemaining, paymentLink
    );
  }
};
