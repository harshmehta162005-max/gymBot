Locks in component patterns, Tailwind token usage, and API call shapes for the React dashboard.
Tech: React + Vite + TypeScript + Tailwind + React Router v6 + Axios
5 pages: /dashboard (stats), /members, /payments, /attendance, /reports
Protected routes: check JWT in localStorage, redirect to /login if missing
API base URL from import.meta.env.VITE_API_URL — never hardcode
Axios instance in services/api.ts with Authorization header interceptor
Stats cards on dashboard: total members, due this week, paid this month, attendance rate
All tables use @tanstack/react-table for sorting/filtering
Export buttons trigger CSV download via Blob — never link to a backend download route
Show toast notifications (react-hot-toast) for all API success/error states