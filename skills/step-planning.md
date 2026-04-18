Enforces a "think before you code" workflow so the AI never jumps into implementation without a clear plan.

## When to use
Before starting ANY new phase, feature, or non-trivial code change.

## Rules
1. STOP before writing any code. First, analyze:
   - What files will be created or modified?
   - What dependencies are needed?
   - What existing code will be affected?
   - What could break?

2. Write a mini-plan as a numbered list:
   - Step 1: [exact file path] — [what changes]
   - Step 2: [exact file path] — [what changes]
   - ...

3. Identify risks:
   - Will this break existing imports?
   - Are there circular dependencies?
   - Does this conflict with any skill file rules?

4. Check the PLAN.md to confirm which phase we are in. Never skip phases.

5. Read the relevant skill file BEFORE writing code for that domain (e.g., read razorpay-upi.md before payment code).

6. Only after the plan is clear and risks are identified — start coding.

## Anti-patterns (never do these)
- Writing code first and "figuring it out later"
- Implementing multiple unrelated features in one step
- Skipping the skill file read for the relevant domain
- Creating files not mentioned in the folder structure without asking
