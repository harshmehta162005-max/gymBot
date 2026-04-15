Prevents wrong Razorpay SDK usage — amounts, callback URLs, signature verification.
Use official razorpay Node SDK — never raw axios calls to Razorpay API
Amount is always in paise (₹299 → 29900)
Payment link type: 'link' (not 'page') for UPI deep links
Always set callback_url to your /api/payments/callback route
Verify webhook signature: razorpay_payment_link_id + '|' + razorpay_payment_link_reference_id + '|' + razorpay_payment_link_status + '|' + razorpay_payment_id
Store razorpay_payment_link_id in Payment model for reconciliation
Payment link expires: set expire_by to endDate + 3 days
Test mode: use test keys, real UPI won't work — switch to live before Phase 9