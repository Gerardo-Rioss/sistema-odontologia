# Proposal: Fase 2 — Autenticación y Seguridad

## Intent

Reemplazar los stubs de desarrollo heredados de Fase 1 con autenticación real: login/registro contra Prisma + bcrypt, protección de rutas vía middleware, recuperación de contraseña, y rate limiting. Sin esto, el sistema no admite usuarios reales ni protege datos sensibles.

## Scope

### In Scope
- NextAuth.js authorize() real: busca usuario en Prisma, compara hash bcrypt
- Login page funcional: react-hook-form + Zod + errores en español, conectado a signIn()
- Register page funcional: form → API POST → hash bcrypt → insert en BD
- `src/middleware.ts`: bloquea `/dashboard/**` sin sesión; redirige auth pages si autenticado
- Recuperación de contraseña: token único (crypto.randomUUID), expires en 1h, página solicitud + página reset + API
- Rate limiting: 5 intentos/15 min por IP en endpoints POST de auth
- Sincronización Zustand ↔ NextAuth session (login→set user, logout→clear)
- Schemas Zod: loginSchema, registerSchema, resetPasswordSchema (no existen en validations.ts)
- Prisma extendido: modelo PasswordResetToken + campo emailVerified opcional en User
- Tests unitarios: auth.service.ts, validations, rate limiter

### Out of Scope
- 2FA y OAuth social login
- Envío real de emails (SMTP) — tokens se generan pero no se envían (fase futura)
- Roles complejos (solo ADMIN/DENTIST actuales)
- Gestión de sesiones múltiples ni refresh tokens

## Capabilities

### New Capabilities
- `user-auth`: login, registro, sesión JWT, flujo de recuperación de contraseña
- `auth-rate-limiting`: rate limiting en endpoints de autenticación contra fuerza bruta

### Modified Capabilities
- `database-schema`: User extiende con emailVerified opcional. Nuevo modelo PasswordResetToken (token único, userId FK, expiresAt, cascade delete).

## Approach

1. **Extender Prisma**: PasswordResetToken model + emailVerified? → migration
2. **AuthService**: register() hashea + inserta; validateCredentials() busca + compara; changePassword(), generateResetToken(), resetPassword()
3. **NextAuth**: authorize() → AuthService.validateCredentials(); JWT callback con role real
4. **Middleware**: matcher `/dashboard/:path*`, usa `auth()`; export config con runtime matcher
5. **Pages**: Login/Register funcionales con server action + react-hook-form + Zod
6. **Rate limiter**: Map en memoria (IP → {count, resetTime}); 5 intentos/15 min en login
7. **Password reset**: POST genera token (1h TTL); POST con token + newPassword verifica y actualiza
8. **Zustand sync**: AppLayout consume useSession() → sync con useStore

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | PasswordResetToken model + emailVerified? |
| `src/lib/auth.ts` | Modified | authorize() real con Prisma + bcrypt |
| `src/services/auth.service.ts` | Modified | Implementar 5 métodos de auth |
| `src/lib/validations.ts` | Modified | loginSchema, registerSchema, resetSchema |
| `src/types/index.ts` | Modified | LoginInput, RegisterInput, ResetInput |
| `src/middleware.ts` | **New** | Route protection |
| `src/lib/rate-limit.ts` | **New** | Rate limiter helper |
| `src/app/(auth)/login/page.tsx` | Modified | Form funcional |
| `src/app/(auth)/register/page.tsx` | Modified | Form funcional |
| `src/app/(auth)/reset-password/page.tsx` | **New** | Solicitar reset |
| `src/app/(auth)/reset-password/[token]/page.tsx` | **New** | Nueva contraseña |
| `src/app/api/auth/register/route.ts` | **New** | API registro |
| `src/app/api/auth/reset-password/route.ts` | **New** | API reset |
| `src/store/useStore.ts` | Modified | Sync con sesión |

| Métrica | Valor |
|---------|-------|
| Archivos nuevos | 6 |
| Archivos modificados | 9 |
| Complejidad | Media |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| NextAuth v5 beta breaking changes | Low | Versión pineada; CI detecta |
| Rate limit en memoria no escala en serverless | Med | Map para dev; documentar límite |
| Token reset sin email — usuario no lo recibe | Med | Mostrar en UI dev/console; email en fase futura |

## Rollback Plan

`git revert` del merge. Migration de Prisma es aditiva (modelo nuevo + campo opcional) — `prisma migrate reset` si necesario en dev. Sin datos de producción comprometidos.

## Dependencies

- Fase 1 (setup-inicial): Prisma, next-auth@beta, bcryptjs, zod, react-hook-form ya instalados
- PostgreSQL corriendo (Docker o local)
- NEXTAUTH_SECRET en `.env.local`

## Success Criteria

- [ ] Login autentica contra BD real (Prisma + bcrypt)
- [ ] Registro crea usuario con contraseña hasheada
- [ ] Middleware bloquea /dashboard sin sesión
- [ ] Rate limiting rechaza >5 intentos fallidos en 15 min
- [ ] Flujo reset: solicitar token → ingresar token → login exitoso
- [ ] Zustand refleja sesión post-login y se limpia en logout
- [ ] `lint` + `type-check` pasan sin errores
- [ ] Tests unitarios de auth.service + validations pasan
