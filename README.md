<p align="center">
  <img src="https://img.shields.io/badge/GymWaBot-💪-green?style=for-the-badge&labelColor=0e0e0e&color=39ff14" alt="GymWaBot" />
</p>

<h1 align="center">GymWaBot — WhatsApp-Powered Gym Management</h1>

<p align="center">
  <strong>A production-ready, full-stack gym management platform with WhatsApp automation, AI-powered reminders, geofenced attendance, and a premium owner dashboard.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18+-61DAFB?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-7.0-47A248?logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5.2-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/WhatsApp-API-25D366?logo=whatsapp&logoColor=white" />
  <img src="https://img.shields.io/badge/Gemini-AI-4285F4?logo=google&logoColor=white" />
</p>

---

## 🎯 What is GymWaBot?

GymWaBot is a **complete gym management system** that lets gym owners manage members, track payments, monitor attendance, and automate WhatsApp communications — all from a single beautiful dashboard.

### ✨ Core Features

| Feature | Description |
|---------|-------------|
| 📊 **Dashboard** | Real-time stats — total members, revenue, pending dues, attendance trends |
| 👥 **Member Management** | Add, edit, delete, mute, and organize members with plans & notes |
| 💰 **Smart Payments** | Partial/full payments with custom amount stepper, live balance preview, WhatsApp receipts |
| 📅 **Attendance System** | Geofenced WhatsApp live location check-in, QR scan, manual marking |
| 🔥 **Streak Tracking** | Auto-calculated attendance streaks with milestone celebrations |
| 🤖 **WhatsApp Bot** | AI-powered chatbot — members text "hi" for menu, "status" for info, share location for attendance |
| 🔔 **Auto Reminders** | Scheduled payment reminders (before AND after due date) via WhatsApp |
| 📈 **Reports** | Downloadable reports, revenue analytics, member breakdowns |
| 📜 **Activity History** | Full audit trail — every payment, member change, reminder logged |
| ⚙️ **Settings** | Business hours (multi-shift), geofence radius, reminder config, password change |

---

## 🏗️ Architecture

```
gymBot/
├── client/                          # React + Vite + TailwindCSS
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx           # Sidebar navigation (dynamic gym name)
│   │   │   └── ProtectedRoute.tsx   # JWT auth guard
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx        # Stats overview + charts
│   │   │   ├── Members.tsx          # CRUD + payment modal + streaks
│   │   │   ├── Payments.tsx         # Payment links + history
│   │   │   ├── Attendance.tsx       # Location check-ins + leaderboard
│   │   │   ├── Reports.tsx          # Analytics + exports
│   │   │   ├── History.tsx          # Activity audit log
│   │   │   ├── Settings.tsx         # Comprehensive settings page
│   │   │   └── Login.tsx            # Auth + registration + location picker
│   │   └── services/
│   │       └── api.ts               # Axios instance with JWT interceptor
│   └── tailwind.config.js           # Custom brand colors
│
├── server/                          # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── config/
│   │   │   └── env.ts               # Environment variable loader
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts   # Login, register, settings, password
│   │   │   ├── member.controller.ts # CRUD, payments, notes, mute
│   │   │   ├── attendance.controller.ts  # Mark attendance + stats + streaks
│   │   │   ├── webhook.controller.ts     # WhatsApp message handler
│   │   │   ├── payment.controller.ts     # Razorpay integration
│   │   │   └── activity.controller.ts    # Activity log CRUD
│   │   ├── models/
│   │   │   ├── Owner.model.ts       # Gym owner + all settings
│   │   │   ├── Member.model.ts      # Member + plan + streak fields
│   │   │   ├── Payment.model.ts     # Payment records
│   │   │   ├── Attendance.model.ts  # Attendance + location data
│   │   │   └── Activity.model.ts    # Audit log entries
│   │   ├── services/
│   │   │   ├── whatsapp.service.ts  # Meta WhatsApp Cloud API
│   │   │   ├── razorpay.service.ts  # Payment link generation
│   │   │   ├── gemini.service.ts    # AI reminder generation
│   │   │   └── cron.service.ts      # Scheduled reminder jobs
│   │   ├── middleware/
│   │   │   ├── auth.ts              # JWT verification
│   │   │   └── asyncHandler.ts      # Express async error wrapper
│   │   ├── utils/
│   │   │   ├── geo.ts               # Haversine formula for geofencing
│   │   │   └── logger.ts            # Structured logging
│   │   ├── routes/
│   │   │   └── api.routes.ts        # All API routes
│   │   └── index.ts                 # Express app entry point
│   └── tsconfig.json
│
├── package.json                     # Monorepo workspaces config
├── .env.example                     # Environment template
└── .gitignore
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18.x
- **MongoDB** (local or [Atlas](https://www.mongodb.com/atlas))
- **WhatsApp Business API** access ([Meta Developer Portal](https://developers.facebook.com/))
- **Razorpay** account ([razorpay.com](https://razorpay.com/))
- **Google Gemini API Key** ([ai.google.dev](https://ai.google.dev/))

### 1. Clone & Install

```bash
git clone https://github.com/harshmehta162005-max/gymBot.git
cd gymBot
npm install
```

### 2. Configure Environment

Create a `.env` file inside the `server/` directory:

```bash
cp server/.env.example server/.env
```

Fill in your keys:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/gymwabot
JWT_SECRET=your-super-secret-jwt-key

# WhatsApp Cloud API
WHATSAPP_API_KEY=your_whatsapp_bearer_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_APP_SECRET=your_app_secret
WEBHOOK_VERIFY_TOKEN=your_custom_verify_token

# Razorpay
RAZORPAY_KEY_ID=rzp_live_xxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# App
APP_URL=http://localhost:5000
NODE_ENV=development
```

Create a `.env` file inside `client/` (or use the example):

```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Run Development Server

```bash
npm run dev
```

This starts both client (`:3000`) and server (`:5000`) concurrently.

### 4. Register Your Gym

Open `http://localhost:3000` → Click **Register** → Enter your gym name, email, password, phone, and optionally set your gym location for attendance geofencing.

---

## 🤖 WhatsApp Bot Commands

Members can text your WhatsApp Business number:

| Command | Response |
|---------|----------|
| `hi` / `hello` / `menu` | Welcome message + interactive buttons |
| `attendance` / `check in` / `hajri` | Sends location request for geofenced check-in |
| `status` | Shows plan status, dues, streak info |
| `pay` | Shows pending dues info |
| `streak` | Shows current & best attendance streak |
| *Share location* | Auto checks distance from gym, marks attendance if within radius |

---

## ⚙️ Settings (Configurable from Dashboard)

All of these are configurable from the **Settings** page — no code changes needed:

| Setting | Description |
|---------|-------------|
| **Gym Profile** | Name, owner, phone, business hours (multi-shift) |
| **Geofence** | Gym coordinates, radius slider (10m – 500m) |
| **Payments** | Default monthly fee, currency, grace period |
| **Reminders** | Enable/disable, days before & after due, time, language (English/Hindi/Hinglish) |
| **Attendance** | Allowed methods, duplicate window, streak milestones |
| **WhatsApp** | Auto-reply toggle, custom welcome message template |
| **Security** | Change password |

---

## 📱 Key Workflows

### 💰 Recording a Payment

1. Go to **Members** → Click `⋯` menu → **Record Payment**
2. See the **Summary Card** showing monthly fee, outstanding balance
3. Use **+/- stepper** (steps by monthly fee) or **Quick Fill** buttons (25%, 50%, 75%, Full)
4. See the **live progress bar** showing remaining balance
5. Submit → Member receives a **WhatsApp receipt** instantly

### 📍 WhatsApp Location Attendance

1. Member texts "attendance" to the gym's WhatsApp number
2. Bot sends a **"Share Location"** button
3. Member shares live location
4. Server calculates distance via **Haversine formula**
5. If within the **geofence radius** → ✅ Attendance marked, streak updated
6. If outside → ❌ "Too far" message with exact distance

### 🔔 Automated Reminders

- Runs daily at **8:00 AM IST** (configurable)
- Sends reminders X days **before** due date (default: 1, 3, 7 days)
- Sends reminders X days **after** due date for overdue members
- Uses **Gemini AI** to generate polite, personalized messages
- Language configurable: English, Hindi, or Hinglish
- Includes **Razorpay payment link** in each reminder
- Respects per-member **mute** settings

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, Lucide Icons |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | MongoDB + Mongoose |
| **Auth** | JWT (JSON Web Tokens) |
| **WhatsApp** | Meta WhatsApp Cloud API |
| **Payments** | Razorpay Payment Links API |
| **AI** | Google Gemini (reminder message generation) |
| **Scheduling** | node-cron (daily reminder jobs) |
| **Geolocation** | Haversine formula (server-side distance calculation) |

---

## 📂 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new gym owner |
| POST | `/api/auth/login` | Login and get JWT |
| GET | `/api/owner/settings` | Get all owner settings |
| PUT | `/api/owner/settings` | Update settings |
| PUT | `/api/owner/change-password` | Change password |

### Members
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/members` | List members (paginated, filterable) |
| POST | `/api/members` | Create new member |
| GET | `/api/members/:id` | Get single member |
| PUT | `/api/members/:id` | Update member |
| DELETE | `/api/members/:id` | Delete member |
| POST | `/api/members/:id/partial-payment` | Record payment |
| PUT | `/api/members/:id/mute` | Mute/unmute member |
| PUT | `/api/members/:id/due-date` | Update due date |
| POST | `/api/members/:id/notes` | Add note |
| GET | `/api/members/stats` | Dashboard stats |

### Attendance
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/attendance` | List attendance records |
| POST | `/api/attendance` | Mark attendance manually |
| GET | `/api/attendance/stats` | Attendance stats + streak leaderboard |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payments` | List payment records |
| POST | `/api/payments/create-link` | Generate Razorpay link |

### Webhook
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/webhook` | WhatsApp verification |
| POST | `/webhook` | Incoming message handler |

### Activity
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/activity` | Get activity history |
| DELETE | `/api/activity` | Clear all history |

---

## 🌐 Deployment

### Backend (Render / Railway / VPS)

```bash
cd server
npm run build
npm start
```

### Frontend (Vercel / Netlify)

```bash
cd client
npm run build
# Deploy the `dist/` folder
```

> **Important:** Set your `VITE_API_URL` environment variable in your frontend hosting to point to your production backend URL.

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

This project is for **educational and personal use**. All rights reserved.

---

<p align="center">
  Built with 💪 by <a href="https://github.com/harshmehta162005-max">Harsh Mehta</a>
</p>
