Locks in the exact schema shapes for all 4 models so the AI never drifts from the agreed design.
4 models: Owner, Member, Attendance, Payment — never add more without asking
Member: name, phone (unique, indexed), planType, startDate, endDate, status (active/frozen/expired), whatsappOptIn
Payment: memberId (ref), amount, razorpayLinkId, razorpayLinkUrl, status (pending/paid/expired), paidAt
Attendance: memberId (ref), date (Date, not String), method (whatsapp-reply/qr-scan)
Owner: email (unique), passwordHash, gymName, phone
Always add createdAt/updatedAt via timestamps:true
Index Member.phone and Member.endDate for reminder queries
Use pre('save') hook to auto-set Member.status based on endDate