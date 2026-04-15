Defines all route shapes, middleware order, and error handling so the AI builds consistent, secure Express code.
Middleware order: helmet → cors → express.json → webhookValidator → routes → errorHandler
Routes: POST /webhook, GET /webhook, GET/POST /api/members, GET/POST /api/payments, GET /api/attendance, POST /api/auth/login
All /api/* routes require JWT auth middleware except /api/auth/login
Webhook route MUST validate signature BEFORE parsing body — use raw body buffer
Rate limit: 100 req/15min globally, 10 req/15min for /api/auth
Error handler always returns { success: false, message, code } shape
Never expose stack traces in production (check NODE_ENV)
All controllers are async/await — wrap in a asyncHandler utility to avoid try/catch repetition