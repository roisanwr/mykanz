## 2025-05-13 - Dashboard Waterfall Fix
**Learning:** Found sequential independent DB queries `await prisma...` within server component causing a waterfall effect in dashboard rendering speed.
**Action:** Always verify if multiple asynchronous Prisma queries can be grouped inside `await Promise.all()` to improve page load times.
