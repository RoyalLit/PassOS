# CHECKPOINT — Build Passes

## What Changed This Session

### Structural
- Split `types/index.ts` → 7 domain files (`shared`, `profile`, `pass`, `tenant`, `escalation`, `notification`, `audit`)
- Moved `theme-provider.tsx` → `components/layout/`
- Renamed `components/common/` → `components/realtime/`
- Updated all imports (~40 files) for the three changes above

### Hash Chain (Migration 048)
- Added `record_hash` (SHA-256) and `prev_hash` to `audit_logs`
- Backfill + trigger for new rows
- `verify_audit_chain()` function
- `recordAuditLog()` now requires `tenantId` parameter; all 5 superadmin callers pass it

### Removed Redundant RealTime
- Deleted: `live-data-sync.tsx`, `realtime-refresh.tsx`, `use-realtime.ts`
- Removed `LiveDataSync` from dashboard layout
- Moved `PushNotificationProvider` from root `layout.tsx` → dashboard `layout.tsx`
- Exorcised all remaining imports from admin dashboard, students directory, and analytics pages

### Asset Fixes
- Deleted 4 orphaned `public/landing/*.png` screenshots (2.1MB)
- SW badge badge-72x72.png 404 → now falls back to `/icons/icon-192x192.png`
- Font: removed `adjustFontFallback: false` (was skipping fallback font generation)
- `next.config.ts` remotePatterns: narrowed from `**` to explicit `*.supabase.co`, `avatars.githubusercontent.com`, `lh3.googleusercontent.com`, `gravatar.com`

### Dynamic Imports
- `FraudTable` (admin/fraud) — lazy-loaded with spinner
- `ApprovalPanel` (admin) — lazy-loaded with skeleton
- `ActivityCharts` (admin) — lazy-loaded with skeleton
- `WardenAnalyticsCharts` (warden/analytics) — lazy-loaded with skeleton

### API Performance
- `superadmin/users/route.ts`: explicit columns + `.limit(100)`
- `admin/users/route.ts`: `.limit(200)`
- `admin/escalation/templates/route.ts`: `Promise.all` for parallel tenant + system template queries
- `requests/route.ts`, `parent/requests/route.ts`, `parent/request-for-student/route.ts`, `parent/decide/route.ts`: switched `.single()` → `.maybeSingle()` on queries that check for null returns (prevents PGRST116 errors)

### Restored
- `client-edit-profile-button.tsx` (was accidentally deleted)

## Build Status
- `npm run build` — PASSES (0 errors, 0 warnings)
- TypeScript strict mode
- All routes render, middleware proxying works

## Still Open
- `public/icons/icon-192x192.png` and `icon-512x512.png` are 310KB each (should be <10KB) — SW caches them on install
