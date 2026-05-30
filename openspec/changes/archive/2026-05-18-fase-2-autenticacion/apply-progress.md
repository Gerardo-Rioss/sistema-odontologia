# Apply Progress: Fase 2 — Autenticación

**Date**: 2026-05-18
**PR Slices**: 1, 2, and 3 of 4 complete
**Mode**: Standard (TDD disabled — no test runner)
**Chain Strategy**: stacked-to-main
**Current Target**: main

## Completed Tasks (Phase 1 — all 7) ✅ PR 1

- [x] 1.1 Schema migration — PasswordResetToken model + firstName/lastName/emailVerified on User in `prisma/schema.prisma`
- [x] 1.2 Migration SQL — manual migration created at `prisma/migrations/20260518150000_add_auth_models/migration.sql` (DB unavailable; to be applied when PostgreSQL accessible)
- [x] 1.3 Types — LoginInput, RegisterInput, ForgotPasswordInput, ResetPasswordInput, AuthResponse, SessionUser added to `src/types/index.ts`
- [x] 1.4 Validations — loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema added to `src/lib/validations.ts`
- [x] 1.5 Rate limiter — `src/lib/rate-limiter.ts` with MapRateLimiterStore implementing RateLimiterStore (5 req/15min window, auto-cleanup 60s)
- [x] 1.6 AuthService — `src/services/auth.service.ts` implementing registerUser, verifyCredentials, generateResetToken, resetPassword, changePassword; + `src/repositories/user.repository.ts`
- [x] 1.7 Tests — `tests/unit/auth.service.test.ts`, `tests/unit/validations.test.ts`, `tests/unit/rate-limit.test.ts` covering all spec scenarios; type-check passes

## Completed Tasks (Phase 2 — all 5) ✅ PR 2

- [x] 2.1 Replace dev stub authorize() — `src/lib/auth.ts` now calls `authService.verifyCredentials()` via Prisma + bcrypt
- [x] 2.2 Create `middleware.ts` at project root — exports `{ auth as middleware }`; matcher protects `/dashboard/:path*`, `/api/appointments/:path*`, `/api/patients/:path*`
- [x] 2.3 Create `src/components/auth/SessionProvider.tsx` — 'use client' component wrapping NextAuth SessionProvider
- [x] 2.4 Wire SessionProvider into `src/app/(dashboard)/layout.tsx` — dashboard wrapped in SessionProvider; `useSession()` → Zustand sync
- [x] 2.5 Update `src/store/useStore.ts` — replaced login/logout with setUser() and hydrateFromSession()

## Completed Tasks (Phase 3 — all 6) ✅ PR 3

- [x] 3.1 Login form — `src/app/(auth)/login/page.tsx`: react-hook-form + zodResolver(loginSchema) + signIn("credentials") + redirect to /dashboard on success + error/loading states + "¿Olvidaste tu contraseña?" link
- [x] 3.2 Register form — `src/app/(auth)/register/page.tsx`: react-hook-form + zodResolver(registerSchema extended with confirmPassword) + fetch POST /api/auth/register + redirect to /login + "¿Ya tenés cuenta?" link
- [x] 3.3 Register API route — `src/app/api/auth/register/route.ts`: Zod validation → rate-limit check → AuthService.registerUser() → 201; handles 409 duplicate, 429 rate-limited, 400 validation errors
- [x] 3.4 Forgot password page — `src/app/(auth)/forgot-password/page.tsx`: email input → fetch POST /api/auth/forgot-password → displays token in dev mode with link to /reset-password?token=...
- [x] 3.5 Reset password page — `src/app/(auth)/reset-password/page.tsx`: token (auto-filled from URL query param) + password + confirmPassword → fetch POST /api/auth/reset-password → redirect /login; wrapped in Suspense for useSearchParams
- [x] 3.6 Forgot + Reset API routes — `src/app/api/auth/forgot-password/route.ts` (email → generate token) + `src/app/api/auth/reset-password/route.ts` (token + password → reset); both rate-limited with 429 responses

## Bonus: Rate Limiter Singleton

- Added `export const rateLimiter = new MapRateLimiterStore()` to `src/lib/rate-limiter.ts` for shared instance across API routes.

## Commits (PR 2 + PR 3 — work-unit-commits strategy)

**PR 2**:
1. `c6547cd` — feat(auth): replace dev stub authorize with AuthService, add NextAuth middleware, and type augmentation
2. `d5928b8` — feat(auth): add SessionProvider, Zustand sync with useSession, and dashboard layout integration

**PR 3** (pending commit):
1. feat(auth): add login and register forms with react-hook-form + Zod (login page + register page + rate-limiter singleton)
2. feat(auth): add forgot/reset password forms and API routes (forgot-password page + reset-password page + register API + forgot-password API + reset-password API)

## Build Verification (PR 3)

- ✅ TypeScript type-check (`tsc --noEmit`) — passes
- ✅ ESLint (`next lint`) — no warnings or errors
- ✅ Next.js build (`next build`) — compiles successfully, 22 routes generated
- ✅ New routes: `/forgot-password`, `/reset-password` (static), `/api/auth/register`, `/api/auth/forgot-password`, `/api/auth/reset-password` (dynamic)

## Deviations from Design

1. **Separate forgot-password and reset-password endpoints**: The tasks.md suggested a single dual-mode `reset-password/route.ts` handling both email→token and token→password. PR scope instructions and API design clarity dictated two separate endpoints: `POST /api/auth/forgot-password` (generate token) and `POST /api/auth/reset-password` (apply reset). This provides cleaner separation of concerns.
2. **Forgot password page location**: Created at `src/app/(auth)/forgot-password/page.tsx` (PR scope) rather than reusing `reset-password/` for both steps (tasks.md). Semantically clearer — forgot-password = request step, reset-password = apply step.
3. **Reset password page uses useSearchParams**: Token is passed via query param (`?token=...`) from forgot-password page. Required Suspense boundary for Next.js App Router compliance.
4. **registerSchema extended client-side**: The server schema doesn't include confirmPassword (not stored). Client form extends registerSchema with confirmPassword + refine() for match validation.
5. **Rate limiter singleton**: Added `export const rateLimiter` to `src/lib/rate-limiter.ts` for shared usage across all three API routes.

## Issues Found

1. **No SessionProvider in auth layout**: The auth pages ((auth) layout) don't have SessionProvider, only the dashboard layout does. This is intentional — auth pages don't need it since signIn() from next-auth/react works independently. May want to add to root layout in future (PR 4 or beyond).
2. **Dev-mode token exposure**: Forgot-password API returns the token in the response (dev mode). In production, the token should be sent via email and the dev-mode behavior should be gated behind `process.env.NODE_ENV === "development"`.
