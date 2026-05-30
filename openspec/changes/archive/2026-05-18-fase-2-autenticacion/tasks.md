# Tasks: Fase 2 — Autenticación y Seguridad

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~700–900 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Foundation: schema, types, validations, rate-limiter, AuthService, unit tests | PR 1 | base: main; ~350 lines; self-contained |
| 2 | Core auth: authorize(), middleware, SessionProvider, Zustand sync | PR 2 | base: main; ~115 lines; depends on PR 1 |
| 3 | UI: login/register forms, reset pages, register + reset API routes | PR 3 | base: main; ~400 lines; depends on PR 2 |
| 4 | Cleanup: lint, type-check, migration verify, walk all 20 scenarios | PR 4 | base: main; ~20 lines; depends on PR 3 |

## Phase 1: Foundation

- [x] 1.1 Add `PasswordResetToken` model + `emailVerified DateTime?` field to User in `prisma/schema.prisma`
- [x] 1.2 Run `prisma migrate dev --name add_password_reset` to generate migration (manual SQL created — DB unavailable)
- [x] 1.3 Add `LoginInput`, `RegisterInput`, `ResetPasswordInput` interfaces in `src/types/index.ts`
- [x] 1.4 Add `loginSchema`, `registerSchema`, `resetPasswordSchema` Zod schemas in `src/lib/validations.ts`
- [x] 1.5 Create `src/lib/rate-limit.ts`: `MapRateLimiterStore` class + `RateLimiterStore` interface (5 req / 15 min window per IP)
- [x] 1.6 Implement `AuthService` in `src/services/auth.service.ts`: `register()` (bcrypt 12 + prisma.create), `validateCredentials()` (findUnique + compare), `generateResetToken()` (randomUUID + 1h TTL + used flag), `resetPassword()` (validate token → hash → delete token)
- [x] 1.7 Create `tests/unit/auth.service.test.ts`, `tests/unit/validations.test.ts`, `tests/unit/rate-limit.test.ts` covering all spec scenarios

## Phase 2: Core Auth

- [x] 2.1 Replace dev stub `authorize()` in `src/lib/auth.ts` with `AuthService.validateCredentials()` via Prisma; set `session.maxAge: 86400` (24h)
- [x] 2.2 Create `src/middleware.ts`: matcher `["/dashboard/:path*","/login","/register"]`, redirect unauth→/login, authed→/dashboard
- [x] 2.3 Wrap `{children}` with `<SessionProvider>` from `next-auth/react` in `src/app/layout.tsx`
- [x] 2.4 Add `useSession()`→Zustand sync + logout button calling `signOut()` in `src/app/(dashboard)/layout.tsx`
- [x] 2.5 Add `hydrateFromSession(session: Session)` action in `src/store/useStore.ts`

## Phase 3: UI & API

- [x] 3.1 Replace login placeholder with `react-hook-form` + `zodResolver(loginSchema)` + `signIn("credentials", {redirect: false})` in `src/app/(auth)/login/page.tsx`
- [x] 3.2 Replace register placeholder with `react-hook-form` + `zodResolver(registerSchema)` + `fetch POST /api/auth/register` in `src/app/(auth)/register/page.tsx`
- [x] 3.3 Create `src/app/api/auth/register/route.ts`: POST validate→rate-limit→AuthService.register()→201/409
- [x] 3.4 Create `src/app/(auth)/forgot-password/page.tsx`: email input→POST token request→success message + dev-mode token display
- [x] 3.5 Create `src/app/(auth)/reset-password/page.tsx`: token + password input→POST reset→redirect /login (token pre-filled from URL query param)
- [x] 3.6 Create `src/app/api/auth/reset-password/route.ts` + `src/app/api/auth/forgot-password/route.ts`: separate endpoints for token generation and password reset

## Phase 4: Cleanup

- [x] 4.1 Run `lint` + `type-check`, fix any errors
- [x] 4.2 Verify all 20 spec scenarios: register(3), login(3), session sync(2), reset(4), rate-limit(4), schema(4)
- [x] 4.3 Confirm `prisma migrate dev` applies cleanly; verify `emailVerified?` + `PasswordResetToken` in DB
