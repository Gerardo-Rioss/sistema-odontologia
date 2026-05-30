# Design: Fase 2 — Autenticación y Seguridad

## Technical Approach

Replace dev stubs with real auth: NextAuth Credentials + JWT, Prisma user lookup, bcrypt comparison, Zod validation on forms, rate-limited API routes, and password reset via one-time tokens. The architecture preserves the existing NextAuth v5 setup (JWT strategy, Credentials provider) and extends it with a real `authorize()` callback backed by `AuthService`. Forms use react-hook-form + Zod on the client. Zustand syncs session on mount via `useSession()`.

## Architecture Decisions

| Decision | Options | Choice | Rationale |
|----------|---------|--------|-----------|
| Auth mechanism | Adapter (DB sessions) vs Credentials + JWT | Credentials + JWT | No OAuth needed. JWT is stateless — no DB hits per request. Already configured. Schema has `password` field. |
| Password hashing | bcrypt cost 10 vs 12 vs 14 | 12 rounds | ~300ms on modern hardware. Good brute-force resistance without degrading login UX. bcryptjs async API avoids blocking event loop. |
| Rate limiting store | In-memory Map vs Redis vs Upstash | In-memory Map with `RateLimiterStore` interface | Zero deps for dev. Interface allows Redis swap later. Map resets on cold start — acceptable for single-instance clinic app. |
| Form submission | Server Actions vs Route Handlers vs signIn() | `signIn("credentials")` for login, Route Handlers for register/reset | Login uses built-in NextAuth flow via `signIn()`. Register/reset are custom endpoints outside NextAuth scope. |
| Password reset token | crypto.randomUUID() vs JWT | crypto.randomUUID() | Single-use, opaque, stored in DB with TTL. No signing key needed. Simpler than JWT for one-time token use. |

## Data Flow

### Login
```
LoginForm ──signIn("credentials")──→ NextAuth API Route
  └─→ authorize({email, password})
       └─→ AuthService.validateCredentials()
            ├─→ prisma.user.findUnique({email})
            └─→ bcrypt.compare(password, hash)
  └─→ JWT callback: token.id, token.role
  └─→ session callback → redirect /dashboard
```

### Register
```
RegisterForm ──POST /api/auth/register──→ validate(registerSchema)
  └─→ rate-limit check (IP)
  └─→ AuthService.register({email, password, name})
       ├─→ check duplicate → 409
       ├─→ bcrypt.hash(password, 12)
       └─→ prisma.user.create({...})
  └─→ 201 → redirect /login
```

### Password Reset
```
Request token:  POST /api/auth/reset-password {email}
  └─→ find user → crypto.randomUUID() → save token (1h TTL) → 200

Apply reset:    POST /api/auth/reset-password {token, password}
  └─→ find token → check expiresAt → bcrypt.hash → update user.password → delete token → 200
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modify | Add `PasswordResetToken` model + `emailVerified DateTime?` on User |
| `src/lib/auth.ts` | Modify | Replace dev stub `authorize()` with Prisma + bcrypt lookup via AuthService |
| `src/services/auth.service.ts` | Modify | Implement: register, validateCredentials, changePassword, generateResetToken, resetPassword |
| `src/lib/validations.ts` | Modify | Add loginSchema, registerSchema, resetPasswordSchema (Zod) |
| `src/types/index.ts` | Modify | Add LoginInput, RegisterInput, ResetPasswordInput |
| `src/middleware.ts` | **New** | Route guard: block `/dashboard/*` without session, redirect auth pages if authenticated |
| `src/lib/rate-limit.ts` | **New** | RateLimiter class: Map store, configurable window (5/15min), `RateLimiterStore` interface |
| `src/app/(auth)/login/page.tsx` | Modify | Dynamic LoginForm: react-hook-form + Zod, signIn(), error/loading states |
| `src/app/(auth)/register/page.tsx` | Modify | Dynamic RegisterForm: react-hook-form + Zod, POST to API, redirect on success |
| `src/app/(auth)/reset-password/page.tsx` | **New** | Email input form → POST token request → success message |
| `src/app/(auth)/reset-password/[token]/page.tsx` | **New** | Password input form → POST reset → redirect to /login |
| `src/app/api/auth/register/route.ts` | **New** | POST: validate → rate-limit → register → 201 |
| `src/app/api/auth/reset-password/route.ts` | **New** | POST: dual-mode — token generation (email) or password update (token + password) |
| `src/app/layout.tsx` | Modify | Wrap children with `SessionProvider` from `next-auth/react` |
| `src/app/(dashboard)/layout.tsx` | Modify | Consume `useSession()`, sync to Zustand, add logout + user display in header |
| `src/store/useStore.ts` | Modify | Add `hydrateFromSession(session)`; existing login/logout remain for manual control |

**Totals**: 6 new files, 10 modified, 0 deleted. ~400 lines estimated.

## Component Design

### LoginForm (client component)
- **Props**: none (uses `signIn` from next-auth/react, `useRouter`)
- **Validation**: `loginSchema` (Zod: email required, password min 1)
- **States**: `idle` → `loading` (submitting) → `error` (CredentialsSignin → "Credenciales inválidas") → `success` (redirect)
- **Deps**: react-hook-form, @hookform/resolvers/zod, signIn("credentials", {redirect: false})

### RegisterForm (client component)
- **Props**: none
- **Validation**: `registerSchema` (Zod: name min 1, email valid, password min 8)
- **States**: `idle` → `loading` → `error` (server 409/400) → `success` (message + redirect to /login)
- **Deps**: react-hook-form, fetch POST /api/auth/register

### Middleware pattern
```typescript
// matcher covers dashboard (protected) + auth pages (redirect if logged in)
export const config = { matcher: ["/dashboard/:path*", "/login", "/register"] };
```
Auth pages redirect to `/dashboard` if session exists. Dashboard redirects to `/login?callbackUrl=...` if no session. API routes excluded via matcher.

## Database Changes

```prisma
model PasswordResetToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  used      Boolean  @default(false)
  createdAt DateTime @default(now())
  @@map("password_reset_tokens")
}
```

User gains `emailVerified DateTime?` (future email verification, no logic in this phase).

## Rate Limiting Contract

```typescript
export interface RateLimiterStore {
  increment(key: string): { count: number; resetTime: number };
  reset(key: string): void;
}
```
Default: `MapRateLimiterStore` (in-memory). Swap to `RedisRateLimiterStore` implements same interface.

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Unit | `auth.service.ts` | Mock Prisma + bcryptjs. Test: register (success, duplicate), validateCredentials (match, mismatch, not-found), reset flow (valid token, expired, reused) |
| Unit | `validations.ts` auth schemas | Valid/invalid shapes: email format, password min 8, required fields |
| Unit | `rate-limit.ts` | Increment/decrement within window, exact boundary, reset after expiry |

Tests in `tests/unit/` with Jest + ts-jest. No integration tests — Prisma interactions mocked at service boundary.

## Migration / Rollout

1. `prisma migrate dev --name add_password_reset` — additive migration only (new model + optional field on User)
2. Deploy. No data loss risk. Rollback: `git revert` + `prisma migrate reset` in dev.

## Open Questions

- [ ] Should registration be open (any dentist signs up) or invite-only (ADMIN creates users)? Proposal implies open — confirm before implementation.
- [ ] What is session `maxAge`? Default 30 days — acceptable for clinic use, or reduce to 8 hours for security?
