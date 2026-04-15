Defines the exact prompt structure and output format for Hindi/English WhatsApp reminders.
Use @google/genai with gemini-1.5-flash model only — not Pro (cost)
Always set language based on member preference: Hindi/English/Hinglish
Reminder prompt must include: member name, gym name, days remaining, plan amount, payment link
Output must be under 160 characters for WhatsApp display — enforce in prompt
Tone must be polite, not threatening — Delhi RWA context
Never generate the message text directly in the webhook — only in cron job
Cache Gemini client at module level — never instantiate per request
Handle quota exceeded gracefully with a static fallback message template