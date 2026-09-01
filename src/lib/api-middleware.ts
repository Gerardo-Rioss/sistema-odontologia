/**
 * Shared higher-order functions for Next.js 14 App Router API route handlers.
 *
 * Provides:
 *  - `withAuth(handler, options?)` — wraps handlers with NextAuth auth() guard
 *  - `handleServiceError(error)` — maps service errors to typed HTTP responses
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Session } from "next-auth";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors";

// ─── Types ──────────────────────────────────────────────────

type AuthenticatedHandler = (
  request: NextRequest,
  context: { session: Session; params: Record<string, string> }
) => Promise<NextResponse>;

type RawHandler = (
  request: NextRequest,
  context?: { params?: Record<string, string> }
) => Promise<NextResponse>;

interface WithAuthOptions {
  roles?: string[];
}

// ─── handleServiceError ─────────────────────────────────────

export function handleServiceError(error: unknown): NextResponse {
  console.error(error);

  // ZodError → 400 with field-level details
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Datos inválidos",
        details: error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  // Typed domain errors → use status from error
  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  // Fallback → 500
  return NextResponse.json(
    { error: "Error interno del servidor" },
    { status: 500 }
  );
}

// ─── withAuth ───────────────────────────────────────────────

export function withAuth(
  handler: AuthenticatedHandler,
  options?: WithAuthOptions
): RawHandler {
  return async (request: NextRequest, context?: { params?: Record<string, string> }) => {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    // Role check (if roles option provided)
    if (options?.roles && !options.roles.includes(session.user.role ?? "")) {
      return NextResponse.json(
        { error: "No tiene permiso" },
        { status: 403 }
      );
    }

    try {
      return await handler(request, {
        session,
        params: context?.params ?? {},
      } as { session: Session; params: Record<string, string> });
    } catch (error) {
      return handleServiceError(error);
    }
  };
}
