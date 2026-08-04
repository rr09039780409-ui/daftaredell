---
Task ID: 1
Agent: Main
Task: Add local Vazirmatn fonts and create two-version architecture (admin/user)

Work Log:
- Downloaded 8 Vazirmatn woff2 font weights (Thin 100 → Black 900) to /public/fonts/
- Added @font-face declarations for all 8 weights in globals.css
- Removed CDN <link> from layout.tsx
- Updated sw.js to remove CDN vazirmatn cache rule (fonts are now local /fonts/)
- Created /src/lib/admin-guard.ts — returns 404 when NEXT_PUBLIC_HIDE_ADMIN=true
- Added HIDE_ADMIN constant to Header.tsx — hides Shield button and admin tab
- Updated page.tsx — conditional import of AdminPanel, guards admin view rendering
- Added adminGuard() to 10 admin-only API endpoints:
  - POST /api/auth
  - POST /api/books, PUT /api/books/[id], DELETE /api/books/[id]
  - POST /api/categories, DELETE /api/categories/[id]
  - POST /api/announcements, PUT /api/announcements/[id], DELETE /api/announcements/[id]
  - GET+POST /api/backup
  - POST /api/change-password
- Added NEXT_PUBLIC_HIDE_ADMIN=false to .env
- Clean build passed successfully

Stage Summary:
- Font: Vazirmatn now fully local (8 weights), no CDN dependency
- Two versions: set NEXT_PUBLIC_HIDE_ADMIN=true for user-only deployment
  - UI: Shield button, admin tab, and AdminPanel component are completely hidden
  - API: All mutation endpoints return 404 (not 403) — zero admin surface exposed
  - GET /api/books, GET /api/books/[id], GET /api/categories, GET /api/announcements remain public
