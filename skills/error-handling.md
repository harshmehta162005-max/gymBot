Production error handling patterns for the entire stack — prevents silent failures and ensures graceful degradation.

## When to use
When writing any controller, service, middleware, or React component that can fail.

## Backend Error Handling

### Controller Pattern
- ALWAYS use asyncHandler wrapper — never raw try/catch in route handlers
- If try/catch IS needed inside a service, re-throw with context:
  ```
  throw Object.assign(new Error('Razorpay link creation failed'), { statusCode: 502, code: 'PAYMENT_SERVICE_ERROR' });
  ```

### Error Response Shape (mandatory)
Every error response MUST follow this exact shape:
```json
{ "success": false, "message": "Human readable message", "code": "MACHINE_READABLE_CODE" }
```
- Never return raw Error objects or stack traces to the client
- In development: include `stack` field for debugging
- In production: omit `stack` entirely (check NODE_ENV)

### Third-Party Failure Handling
| Service | Failure | Fallback |
|---------|---------|----------|
| WhatsApp API | 429/500 | Log failure, retry once after 5s, then skip |
| Razorpay | Timeout | Return 502 to client with "Payment service temporarily unavailable" |
| Gemini AI | Quota exceeded | Use static fallback message template (defined in gemini.service.ts) |
| MongoDB | Connection lost | Crash server (let Railway auto-restart), log to stderr |

### Logging Rules
- Log every error with timestamp, request path, and error message
- Log every third-party API call (success and failure) for debugging
- Never log: passwords, full tokens, payment card details, raw request bodies with sensitive data

## Frontend Error Handling

### API Call Pattern
- Every Axios call wrapped in try/catch
- On 401: clear localStorage('gw_token'), redirect to /login
- On 4xx: show toast with server's error.message
- On 5xx: show toast "Something went wrong. Please try again."
- On network error: show toast "Unable to connect to server."

### Component Error Boundaries
- Wrap each page in a React Error Boundary component
- Show a user-friendly fallback UI, not a white screen
- Log the error to console in development
