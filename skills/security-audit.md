Production security audit checklist — run before every deployment and after every major feature.

## When to use
- Before Phase 8 (Deployment)
- After completing any route, controller, or middleware
- When adding any new third-party integration

## Security Audit Checklist

### 1. Secrets & Environment
- [ ] All secrets live in .env, never in source code
- [ ] .env is in .gitignore — verify with `git status`
- [ ] .env.example exists with placeholder values only (no real keys)
- [ ] JWT_SECRET is at least 32 characters and randomly generated
- [ ] Different secrets for dev vs production

### 2. Authentication & Authorization
- [ ] Passwords hashed with bcrypt, saltRounds = 12 (never MD5/SHA)
- [ ] JWT tokens expire (7d for dashboard, adjust for sensitivity)
- [ ] JWT payload contains only ownerId, gymName, email — never password
- [ ] All /api/* routes (except /auth/login and /auth/register) require auth middleware
- [ ] 401 on invalid/expired tokens clears frontend storage and redirects

### 3. Input Validation
- [ ] All req.body fields validated before database operations
- [ ] MongoDB ObjectId params validated before findById calls
- [ ] No eval(), new Function(), or dynamic code execution
- [ ] File uploads (if any) validated for type, size, and sanitized names

### 4. API Security
- [ ] Helmet middleware enabled (security headers)
- [ ] CORS restricted to known frontend origin in production (not '*')
- [ ] Rate limiting on all routes (100/15min global, 10/15min auth)
- [ ] Webhook signature (X-Hub-Signature-256) validated before processing body
- [ ] Razorpay callback signature verified before updating payment status
- [ ] No stack traces exposed in production error responses (check NODE_ENV)

### 5. Data Protection
- [ ] No sensitive data logged (passwords, tokens, full card numbers)
- [ ] Database connection string uses SSL in production
- [ ] Member phone numbers stored without country code prefix inconsistency

### 6. Dependency Safety
- [ ] Run `npm audit` — zero critical/high vulnerabilities
- [ ] No deprecated packages in use
- [ ] Lock file (package-lock.json) committed to git
