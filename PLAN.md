# GymWaBot Implementation Plan

This is the crystal-clear, step-by-step implementation blueprint. It is designed to be self-contained so that any AI or developer can understand the full picture and build the project systematically.

## Project Phases

### Phase 0: Prerequisites & Accounts Setup (1–2 days)
**Objective:** Get all external accounts and keys ready (no coding yet).
**Expected Deliverables:** All keys saved securely, `.env.example` prepared.
- **MongoDB Atlas:** Create a free M0 cluster and acquire the connection string.
- **Meta WhatsApp Cloud API (v21.0):** Create app, set up test number, get Permanent Access Token, Phone Number ID, and Webhook Verify Token.
- **Razorpay:** Create account, enable test mode, generate API Key ID & Secret for UPI links.
- **Google AI Studio:** Generate Gemini API key (targeting `gemini-1.5-flash`).
- **GitHub:** Create a private repository.

### Phase 1: Project Setup & Monorepo Structure (1 day)
**Objective:** Create clean monorepo skeleton. (COMPLETED)
**Expected Deliverables:** Monorepo skeleton with both `client` and `server` folders ready.
- Initialize `npm` workspaces.
- Set up `client/` (React + Vite + TypeScript) and `server/` (Express + TypeScript).
- Configure root `package.json` concurrent dev scripts.
- Add `.env.example`, `.gitignore`, `README.md`.

### Phase 2: Database Design & MongoDB Setup (1–2 days)
**Objective:** Design schema and connect.
**Expected Deliverables:** All Mongoose models created and tested.
- Define the 4 core models: `Owner`, `Member`, `Attendance`, `Payment`.
- Set up MongoDB Atlas connection in `/server`.
- Configure Mongoose for proper indexing and validation.
- Create a one-time seed script for test data.

### Phase 3: Core Service Layers (2–3 days)
**Objective:** Reusable services for external APIs.
**Expected Deliverables:** Clean service files with exported functions.
- `whatsapp.service.ts`: Send text/templates, validate webhook signatures.
- `razorpay.service.ts`: Create UPI payment links.
- `gemini.service.ts`: Generate polite Hindi/English reminders.
- `qr.utils.ts`: QR code service and attendance logic.
- `auth.service.ts`: JWT auth handling for owner dashboard.

### Phase 4: Backend API Endpoints & WhatsApp Webhook (3–4 days)
**Objective:** Build the brain of the bot.
**Expected Deliverables:** Backend receives WhatsApp hits and replies properly.
- Scaffold Express with CORS, Helmet, and rate limiting.
- Establish Webhook routes (`GET` for verification, `POST` for messages).
- Build CRUD routes handling: `/api/members`, `/api/payments`, `/api/attendance`.
- Create WhatsApp command handlers (e.g., "Pay", "Attendance").
- Ensure robust error handling (Winston/console logging).

### Phase 5: Automated Reminders & Scheduler (1–2 days)
**Objective:** Daily reminders run automatically.
**Expected Deliverables:** Reminders fire automatically in test mode.
- Use `node-cron` to schedule the daily job at 8 AM IST.
- Fetch due members → send prompt to Gemini service → dispatch via WhatsApp service.
- Log failures and successes.

### Phase 6: Owner Website/Dashboard (React) (3–4 days)
**Objective:** Build the beautiful tracking interface.
**Expected Deliverables:** Owner can log in and view live data.
- Scaffold React router and protected routes (JWT validation).
- Build core pages: Dashboard Home (Stats), Members, Payments, Attendance Calendar, Reports (Exports).
- Wire up Axios instance for API interactions.
- Implement real-time polling (or basic socket setup for MVP).

### Phase 7: Testing & Polish (2 days)
**Objective:** Make it rock-solid.
**Expected Deliverables:** End-to-end flows manually and automatically tested.
- Full flow checking: Onboard → Pay → Mark Attendance → Automated Reminder.
- Dashboard QA with real seeded data.
- Input sanitization, strict rate limiting, webhook security sweeps.
- Mobile responsiveness for the dashboard.

### Phase 8: Deployment (1–2 days)
**Objective:** Go live.
**Expected Deliverables:** Public bot endpoint and live dashboard URL.
- Backend deploy to Railway (handle ENV vars, bind PORT).
- Frontend deploy to Vercel (bind `VITE_API_URL`).
- Link live Railway Webhook URL back to Meta Developer Dashboard.
- Live test on a real WhatsApp number.

### Phase 9: Go-Live, Documentation & Monetization (1 day)
**Objective:** Make it sellable.
**Expected Deliverables:** First customer-ready setup.
- Write a simplified onboarding guide for gym owners.
- Structure pricing (e.g., ₹1,499 setup, ₹299/mo).
- Distribute in local Delhi RWA and fitness networks.

## Total Timeline estimate: 15–22 Days
