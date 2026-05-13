## 2025-05-13 - Dashboard Waterfall Fix
**Learning:** Found sequential independent DB queries `await prisma...` within server component causing a waterfall effect in dashboard rendering speed.
**Action:** Always verify if multiple asynchronous Prisma queries can be grouped inside `await Promise.all()` to improve page load times.
## 2025-05-13 - Next.js Server Actions & Zod Validation
**Learning:** Found mutations bypassing secure validation logic directly hitting database without Zod schema verification.
**Action:** Enforce `zod` object parsing strictly before any Prisma ORM interaction within Server Actions to adhere to enterprise SaaS standards and avoid raw data manipulation vulnerabilities.
