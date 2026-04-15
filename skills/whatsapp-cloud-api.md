Teaches the AI every WhatsApp-specific rule so it never generates broken webhook code or wrong message formats.
Always use Cloud API v21.0 — never On-Premises (deprecated)
Webhook POST: validate X-Hub-Signature-256 with HMAC-SHA256 before processing
Webhook GET: respond 200 with hub.challenge immediately
Message types to handle: text, interactive (button_reply), template
Use /messages endpoint with phone_number_id, not WABA ID
Always check entry[0].changes[0].value.messages before processing — can be empty
Template messages require approved HSM — never send free-form after 24h window
Rate limit: max 80 messages/sec per phone number
Store message IDs to prevent duplicate processing