Self-review checklist to catch bugs, anti-patterns, and quality issues before marking any step as done.

## When to use
Before declaring any feature, controller, service, or page "complete".

## Review Checklist

### Logic & Correctness
- [ ] Does the code handle the happy path correctly?
- [ ] Does it handle edge cases? (empty arrays, null values, missing fields)
- [ ] Are all async functions properly awaited?
- [ ] Are database queries using proper indexes? (check mongoose-schemas.md)

### Error Handling
- [ ] Does every controller use asyncHandler wrapper?
- [ ] Are all errors returned in `{ success: false, message, code }` shape?
- [ ] Are user-facing error messages clear and non-leaking? (no stack traces, no internal IDs)
- [ ] Is there a fallback for third-party API failures? (WhatsApp down, Razorpay timeout, Gemini quota)

### Security
- [ ] No hardcoded secrets anywhere (grep for API keys, passwords, tokens)
- [ ] All user input is validated before use (req.body, req.query, req.params)
- [ ] JWT is verified on all protected routes
- [ ] Webhook signatures are validated before processing
- [ ] Rate limiting is applied on auth routes (10 req/15min) and globally (100 req/15min)

### Performance
- [ ] No N+1 database queries (use populate wisely, batch where possible)
- [ ] Module-level caching for expensive clients (Gemini, Razorpay SDK)
- [ ] No blocking synchronous operations in request handlers

### Code Quality
- [ ] No dead code or commented-out blocks left behind
- [ ] Variable/function names are descriptive
- [ ] No `any` type used unless absolutely necessary — prefer proper interfaces
- [ ] Consistent code style (semicolons, quotes, indentation)
