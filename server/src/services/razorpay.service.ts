import Razorpay from 'razorpay';
import crypto from 'crypto';
import { ENV } from '../config/env.js';

// Official Razorpay Node SDK — never raw axios (per skill spec)
const razorpay = new Razorpay({
  key_id: ENV.RAZORPAY_KEY_ID,
  key_secret: ENV.RAZORPAY_KEY_SECRET,
});

interface CreatePaymentLinkOptions {
  amount: number;       // in rupees — will be converted to paise internally
  memberName: string;
  memberPhone: string;
  description: string;
  callbackUrl: string;
  expireByDate: Date;   // endDate + 3 days
  referenceId: string;  // e.g. memberId or a custom reference
}

/**
 * Create a Razorpay UPI Payment Link.
 * Amount is converted from ₹ to paise (₹299 → 29900).
 * Link type is 'link' (not 'page') for UPI deep links.
 */
export const createPaymentLink = async (options: CreatePaymentLinkOptions) => {
  const expireBy = Math.floor(options.expireByDate.getTime() / 1000); // Unix timestamp

  const link = await razorpay.paymentLink.create({
    amount: options.amount * 100, // ₹ to paise
    currency: 'INR',
    description: options.description,
    customer: {
      name: options.memberName,
      contact: `+91${options.memberPhone}`,
    },
    notify: { sms: false, email: false }, // we notify via WhatsApp ourselves
    callback_url: options.callbackUrl,
    callback_method: 'get',
    expire_by: expireBy,
    reference_id: options.referenceId
    // note: upi_link: true is NOT supported in Test Mode and will throw BAD_REQUEST_ERROR
  });

  return {
    razorpayLinkId: link.id,
    razorpayLinkUrl: link.short_url,
  };
};

/**
 * Verify Razorpay webhook/callback signature.
 * Signature = HMAC-SHA256 of: link_id|reference_id|status|payment_id
 */
export const verifyPaymentSignature = (params: {
  razorpay_payment_link_id: string;
  razorpay_payment_link_reference_id: string;
  razorpay_payment_link_status: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): boolean => {
  const payload =
    params.razorpay_payment_link_id + '|' +
    params.razorpay_payment_link_reference_id + '|' +
    params.razorpay_payment_link_status + '|' +
    params.razorpay_payment_id;

  const expected = crypto
    .createHmac('sha256', ENV.RAZORPAY_KEY_SECRET)
    .update(payload)
    .digest('hex');

  return expected === params.razorpay_signature;
};
