# Architecture & System Design

This document details how the GymWaBot components interconnect.

## Monorepo Layout
The system resides in a single, deeply-integrated monorepo optimized for quick iteration.
- `client/`: React.js SPA (Vite, Tailwind, TypeScript).
- `server/`: Node.js + Express API.
- `packages/types/`: Shared TypeScript domain models (`Member`, `Payment`, `Attendance`) imported by both client and server to guarantee absolute type consistency.

## Data Flow

### 1. Webhooks & WhatsApp
1. WhatsApp users send a message to the bot number.
2. Meta Cloud API POSTs a payload to our Express `/webhook` route.
3. Express middleware immediately validates the `X-Hub-Signature-256` hash.
4. Valid payloads are parsed. If a command matches "Pay" or "Attendance", the respective internal controller handles the logic.
5. Our `whatsapp.service` responds via Axis calls back to Meta's `/messages` API.

### 2. Payments (Razorpay)
1. Owner initiates an invoice, or an automatic node-cron task runs on due dates.
2. Express calls the Razorpay API to generate a unique UPI link.
3. Link is presented to the user via WhatsApp (and saved to the `Payment` document).
4. Razorpay sends a webhook on successful payment.
5. Express updates the `Payment` collection to `paid` and extends the `Member` plan endDate.

### 3. AI Prompts (Gemini)
1. Daily cron triggers at 8:00 AM IST.
2. Queries the DB for members whose `endDate` is <= 3 days away.
3. Batches logic calls the Gemini API (using 1.5 Flash). System context strictly enforces polite, <160-character messages, tailored to local languages.
4. Gemini's response is pushed directly to the `whatsapp.service` to message the member.

### 4. Client Dashboard
1. The Owner hits the Vercel-deployed dashboard.
2. Checks `localStorage` for `gw_token`. Missing token redirects to login.
3. Authenticated Axios calls are made to the `/api/*` endpoints on the Railway-deployed backend.
4. Data is aggressively cached/displayed using standard React abstractions. React extracts CSV reports strictly via Blob blobs directly from the DOM, requiring no specialized backend download endpoints.
