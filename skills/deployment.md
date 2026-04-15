Prevents the most common deployment failures — env vars, webhook URLs, CORS, cold starts.
Backend → Railway: set PORT env var, Railway auto-assigns — never hardcode 3000
Frontend → Vercel: set VITE_API_URL to Railway backend URL in Vercel env vars
After Railway deploy: update Meta webhook URL to https://your-railway-url.railway.app/webhook
CORS: allow only your Vercel frontend URL in production — not '*'
Railway health check: expose GET /health returning { status: 'ok', timestamp }
Add MONGODB_URI, JWT_SECRET, RAZORPAY_KEY_ID etc. to Railway env vars — never commit
WhatsApp webhook verify token must match WEBHOOK_VERIFY_TOKEN env var exactly
Test with real WhatsApp number before declaring Phase 8 complete