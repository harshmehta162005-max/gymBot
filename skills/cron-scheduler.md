Prevents timezone bugs and missed reminders — the most common cron failure point.
Always set timezone: 'Asia/Kolkata' in cron options — never UTC
Reminder job fires at 8:00 AM IST daily: '0 8 * * *'
Query members where endDate is 3 days, 1 day, or 0 days away
Process members in batches of 10 — never fire 50 WhatsApp calls simultaneously
Log every reminder sent and every failure to a reminders_log collection
On failure, retry once after 5 minutes — use setTimeout, not a new cron job
Start cron only after MongoDB connection is confirmed — never at module load
Expose a /api/admin/trigger-reminders endpoint for manual testing