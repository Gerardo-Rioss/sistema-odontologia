# UI/UX Polish — Sistema Odontológico

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Elevar la experiencia visual y del usuario del dashboard odontológico con diseño consistente, animaciones fluidas, micro-interacciones y onboarding guiado.

**Architecture:** Mejoras incrementales sobre la base existente de shadcn/ui + Tailwind + Framer Motion. Tres fases: quick wins de consistencia, polish de animaciones, y onboarding.

**Tech Stack:** Next.js 14, React 18, TypeScript 5.4, Tailwind CSS 3, Framer Motion 11 (ya instalado), shadcn/ui, lucide-react

---

## Diagnóstico Inicial

### Lo que ya está bien ✅
- Sistema de design tokens CSS (OKLCH/HSL) con dark mode completo
- Componentes shadcn/ui consistentes en dashboard
- Arquitectura limpia (Repository → Service → Zod)
- A11y básico (aria-labels, roles, focus)
- Responsive (Sheet móvil, sidebar colapsable)
- 372 tests existentes

### Lo que necesita mejora 🔧
1. **Auth pages inconsistentes**: Login/Register usan clases hardcodeadas (`gray-900`, `blue-600`) y `<input>` nativo en vez de tokens + `<Input>` de shadcn
2. **Sidebar sin tooltips**: Colapsado solo muestra íconos, el usuario no sabe qué es cada uno
3. **Sin animaciones de transición**: Navegación entre páginas es instantánea y seca
4. **Skeleton loading parcial**: Solo StatsCard tiene skeleton; tablas y gráficos usan Spinner
5. **Empty states básicos**: Solo texto + ícono, sin ilustraciones ni CTAs atractivos
6. **Falta micro-interacciones**: Sin feedback táctil en botones, sin conteo animado en stats
7. **Header sin breadcrumbs**: No hay contexto de navegación
8. **Landing page mínima**: Hero básico, sin features visuales ni CTA fuerte
9. **Sin onboarding**: Usuario nuevo no tiene guía

---

## Fase 1: Quick Wins — Consistencia Visual (4 tareas)

### Task 1.1: Migrar Login a design tokens + shadcn Input

**Objective:** Reemplazar clases hardcodeadas y `<input>` nativo por tokens CSS + componente `<Input>` de shadcn.

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`

**Step 1: Reemplazar `inputClass()` helper y `<input>` nativos**

```tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
```

**Step 2: Actualizar JSX de cada campo**
```tsx
<div>
  <Label htmlFor="email" className="text-foreground">Correo Electrónico</Label>
  <Input
    id="email"
    type="email"
    {...register("email")}
    placeholder="correo@consultorio.com"
    className={errors.email ? "border-destructive" : ""}
  />
  {errors.email && (
    <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>
  )}
</div>
```

**Step 3: Mapeo de clases hardcodeadas → design tokens**
- `text-gray-900` → `text-foreground`
- `text-gray-600/500/700` → `text-muted-foreground`
- `bg-red-50 dark:bg-red-950` → `bg-destructive/10`
- `text-red-700 dark:text-red-400` → `text-destructive`
- `bg-blue-600 hover:bg-blue-700` → `bg-primary hover:bg-primary/90`
- `text-blue-600 hover:text-blue-500` → `text-primary hover:text-primary/80`
- `rounded-lg` → `rounded-xl`

**Step 4: Botón submit con Loader2**
```tsx
<Button type="submit" disabled={isLoading} className="w-full">
  {isLoading ? (
    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Ingresando...</>
  ) : "Ingresar"}
</Button>
```

**Verification:**
```bash
npm run type-check && npm test -- --testPathPattern="auth"
```

---

### Task 1.2: Migrar Register a design tokens + shadcn Input

**Objective:** Idéntico a 1.1 pero en register. Mismos imports, mismo mapeo de clases, mismo patrón.

**Files:**
- Modify: `src/app/(auth)/register/page.tsx`

**Verification:**
```bash
npm run type-check && npm test -- --testPathPattern="auth"
```

---

### Task 1.3: Agregar tooltips al Sidebar colapsado

**Objective:** Cuando el sidebar está colapsado (solo íconos), mostrar tooltip con el nombre.

**Files:**
- Modify: `src/components/dashboard/Sidebar.tsx`

**Approach:** Verificar si `TooltipProvider` existe en el árbol. Si no, envolver el sidebar con él. Usar `Tooltip` + `TooltipTrigger` + `TooltipContent` en cada `<Link>` cuando `!sidebarOpen`.

**Verification:**
```bash
npm run type-check
```

---

### Task 1.4: Mejorar landing page pública

**Objective:** Hero más atractivo con features cards mejor presentadas.

**Files:**
- Modify: `src/app/page.tsx`

**Cambios:**
- Agregar `Smile` icon grande en hero
- Feature cards con íconos lucide en vez de emojis
- Agregar gradiente sutil al fondo
- Botones con mejor espaciado
- Agregar tagline secundario

**Verification:**
```bash
npm run type-check
```

---

## Fase 2: Animaciones & Micro-interacciones (4 tareas)

### Task 2.1: Page transitions con Framer Motion

**Objective:** Transición fade+slide al navegar entre páginas del dashboard.

**Files:**
- Create: `src/components/ui/PageTransition.tsx`
- Modify: `src/app/(dashboard)/DashboardClientLayout.tsx`

**PageTransition.tsx:**
```tsx
"use client";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

**DashboardClientLayout:** Envolver `{children}` dentro del `<main>` con `<PageTransition>`.

**Verification:**
```bash
npm run type-check && npm test
```

---

### Task 2.2: Conteo animado en StatsCard

**Objective:** Los números hacen un conteo animado (easeOutCubic, ~800ms).

**Files:**
- Create: `src/hooks/useCountUp.ts`
- Modify: `src/components/dashboard/StatsCard.tsx`

**useCountUp.ts:** Hook que usa `requestAnimationFrame` con easeOutCubic para animar de 0 al valor final. Solo anima valores numéricos; strings con "%" se muestran estáticos.

**StatsCard.tsx:** Integrar `useCountUp` para valores numéricos. Mantener compatibilidad con valores string.

**Verification:**
```bash
npm run type-check && npm test -- --testPathPattern="StatsCard"
```

---

### Task 2.3: Skeleton loading para tablas

**Objective:** Reemplazar Spinner por skeleton rows en tablas durante carga.

**Files:**
- Modify: `src/components/ui/Table.tsx`

**Cambio:** Agregar prop opcional `skeletonRows?: number` (default 5). Cuando `isLoading`, renderizar filas con `<Skeleton>` en vez de Spinner.

**Verification:**
```bash
npm run type-check && npm test -- --testPathPattern="Table"
```

---

### Task 2.4: Micro-interacciones (btn-press + card-hover)

**Objective:** Feedback táctil: scale-down en click de botones, lift sutil en hover de cards.

**Files:**
- Modify: `src/app/globals.css` — agregar utilidades CSS
- Modify: `src/components/ui/button.tsx` — agregar `active:scale-[0.97] transition-transform`

**globals.css additions:**
```css
@layer utilities {
  .btn-press { @apply transition-transform active:scale-[0.97]; }
  .card-hover { @apply transition-shadow hover:shadow-md; }
}
```

**Verification:**
- Visual: navegar por dashboard, verificar animaciones

---

## Fase 3: Onboarding & Empty States (3 tareas)

### Task 3.1: Enhanced Empty States

**Objective:** Empty states más atractivos con íconos redondeados, gradiente sutil y CTAs claros.

**Files:**
- Modify: `src/components/ui/EmptyState.tsx` — agregar prop `title`, mejorar layout

**Cambio:** Ícono dentro de un círculo con bg-muted, título en `text-lg font-semibold`, descripción con `max-w-sm`, botón de acción opcional.

**Verification:**
```bash
npm run type-check && npm test
```

---

### Task 3.2: Onboarding tour (4 pasos)

**Objective:** Tour guiado para nuevos usuarios con spotlight + tooltips.

**Files:**
- Create: `src/hooks/useOnboarding.ts`
- Create: `src/components/onboarding/OnboardingTour.tsx`
- Modify: `src/app/(dashboard)/DashboardClientLayout.tsx` — integrar `<OnboardingTour>`

**Approach:**
- `useOnboarding` hook: maneja estado (paso actual, active, dismissed), persiste en localStorage.
- `OnboardingTour` component: overlay semi-transparente + spotlight en el elemento target + tooltip con navegación (prev/next/dismiss).
- Data attributes en elementos clave: `data-onboarding="sidebar"`, `"new-appointment"`, `"stats"`, `"user-menu"`.
- 4 pasos: Sidebar → Nueva cita → Stats → Perfil.

**Verification:**
```bash
npm run type-check && npm test
```

---

### Task 3.3: Breadcrumbs en Header

**Objective:** Mostrar ruta de navegación en el header.

**Files:**
- Modify: `src/components/dashboard/Header.tsx`

**Cambio:** Función `getBreadcrumbs(pathname)` que parsea la ruta y genera breadcrumbs con links (excepto el último). Usar `ChevronRight` como separador. Visible solo en desktop (`hidden sm:flex`).

**Verification:**
```bash
npm run type-check && npm test -- --testPathPattern="Header"
```

---

## Resumen de Archivos

| Archivo | Acción | Fase |
|---|---|---|
| `src/app/(auth)/login/page.tsx` | Modificar | 1.1 |
| `src/app/(auth)/register/page.tsx` | Modificar | 1.2 |
| `src/components/dashboard/Sidebar.tsx` | Modificar | 1.3 |
| `src/app/page.tsx` | Modificar | 1.4 |
| `src/components/ui/PageTransition.tsx` | Crear | 2.1 |
| `src/app/(dashboard)/DashboardClientLayout.tsx` | Modificar | 2.1 |
| `src/hooks/useCountUp.ts` | Crear | 2.2 |
| `src/components/dashboard/StatsCard.tsx` | Modificar | 2.2 |
| `src/components/ui/Table.tsx` | Modificar | 2.3 |
| `src/app/globals.css` | Modificar | 2.4 |
| `src/components/ui/button.tsx` | Modificar | 2.4 |
| `src/components/ui/EmptyState.tsx` | Modificar | 3.1 |
| `src/hooks/useOnboarding.ts` | Crear | 3.2 |
| `src/components/onboarding/OnboardingTour.tsx` | Crear | 3.2 |
| `src/components/dashboard/Header.tsx` | Modificar | 3.3 |

## Verificación Global

```bash
npm run type-check
npm test
npm run lint
npm run build
```

## Principios

- **DRY**: Reusar tokens CSS existentes, no crear nuevos
- **YAGNI**: Solo animaciones sutiles (200-300ms), nada intrusivo
- **TDD**: Cada cambio con su test correspondiente
- **Commits por tarea**: `git commit -m "feat(ui): migrate login page to design tokens"`
