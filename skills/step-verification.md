Enforces mandatory verification after every code change so nothing ships broken.

## When to use
After EVERY code change — no exceptions.

## Verification Checklist (run in order)
1. **Syntax check**: Does the file have valid TypeScript syntax? Run `npx tsc --noEmit` on the server or client workspace.
2. **Import check**: Do all imports resolve to real files? No broken paths.
3. **Dependency check**: Are all required npm packages installed? If a new import is added (e.g., `import helmet from 'helmet'`), verify it exists in the relevant package.json. If not, install it immediately.
4. **Logic check**: Read the code back — does it do what the step-plan said it would?
5. **Skill compliance**: Does the code follow ALL rules in the relevant skill file? (e.g., amounts in paise for Razorpay, HMAC validation for webhooks, bcrypt saltRounds=12 for passwords)
6. **Error shape**: Do all error responses follow `{ success: false, message, code }` format?
7. **No hardcoded secrets**: Verify no API keys, passwords, or tokens are hardcoded. Everything must come from ENV.

## When verification fails
- Fix the issue immediately before moving to the next step.
- If the fix requires changing the plan, update the plan first.
- Never skip a failing check — a skipped check in dev becomes a production outage.

## Quick commands
- Server type check: `npx tsc --noEmit --project server/tsconfig.json`
- Client type check: `npx tsc --noEmit --project client/tsconfig.json`
- Install missing deps: `npm install <package> --workspace server` or `--workspace client`
