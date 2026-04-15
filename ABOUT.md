# GymWaBot

**WhatsApp Auto-Payment + Attendance Bot for Society Gyms**

## Vision
GymWaBot is designed for society gym owners (specifically targeting the Delhi/NCR region) who waste hours daily on manual tasks: Excel tracking, chasing UPI payments, marking paper/QR attendance, and sending reminders. Members who forget dues lead to revenue leaks, and manual renewals and freezes are often forgotten.

GymWaBot automates these pain points, allowing a single gym owner to onboard 50 members in under 10 minutes, fully automate reminders and payments, and track everything in a lightning-fast, real-time dashboard.

## Core Features
1. **WhatsApp Bot (Members & Owners)**:
   - Automated plan expiry and due date reminders.
   - One-tap Razorpay UPI payment links directly in WhatsApp.
   - Attendance tracking via simple reply or QR code scan.
2. **Owner Dashboard (React Web App)**:
   - Protected web interface for gym owners.
   - Real-time views of member lists, payment statuses, and attendance reports.
   - Alerts for low attendance and forecasts for renewals.
   - Easy exports to Excel/PDF.

## Tech Stack (MERN Monorepo)
Built on 2026 fully production-ready architectures.
- **Database**: MongoDB (via free M0 tier Atlas cluster).
- **Backend Runtime**: Node.js (v20+).
- **Backend Framework**: Express.js handling APIs, webhooks, and core logic.
- **Frontend**: React.js (via Vite + TypeScript + Tailwind CSS) for a premium dashboard.
- **WhatsApp Integration**: Official Meta WhatsApp Cloud API v21.0.
- **Payments Integration**: Official Razorpay Node SDK (UPI Payment Links).
- **AI Integrations**: @google/genai Node SDK using Gemini 1.5 Flash for rapid, polite, multilingual (Hindi/English/Hinglish) reminders.
- **Automations**: node-cron for daily reminder scheduling.
- **Authentication**: JWT-based login for the owner dashboard.
- **Deployment Strategy**: 
  - Backend: Railway or Render.
  - Frontend: Vercel.
