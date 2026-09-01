/**
 * Tests unitarios para api-middleware: withAuth HOF y handleServiceError.
 *
 * Cubre los escenarios de spec/api-route-middleware:
 *  - withAuth: auth exitosa, sin sesión → 401, sin user.id → 401, params enviados, error del handler → delegación
 *  - handleServiceError: ZodError → 400, AppError subclasses → mapped status,
 *    desconocido → 500, console.error
 */

import { NextRequest, NextResponse } from "next/server";
import { handleServiceError } from "@/lib/api-middleware";
import { NotFoundError, ForbiddenError, ConflictError, AppError } from "@/lib/errors";
import { ZodError, ZodIssue } from "zod";

// ─── Mocks ──────────────────────────────────────────────────

const mockAuth = jest.fn();

jest.mock("@/lib/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

// Must import AFTER jest.mock so the mock replaces the real module
import { withAuth, handleServiceError } from "@/lib/api-middleware";

// ─── Helpers ────────────────────────────────────────────────

function makeRequest(path = "/api/test") {
  return new NextRequest(new Request(`http://localhost${path}`));
}

function makeParams(id = "abc-123") {
  return { params: { id } };
}

function makeSession(userId = "user-1", role?: string) {
  return { user: { id: userId, role, name: "Test", email: "test@test.com" } };
}

function makeHandler(returnValue?: NextResponse) {
  return jest.fn().mockResolvedValue(returnValue ?? NextResponse.json({ ok: true }));
}

// ─── withAuth tests ─────────────────────────────────────────

describe("withAuth", () => {
  beforeEach(() => {
    mockAuth.mockReset();
  });

  it("calls handler with session and returns its response", async () => {
    mockAuth.mockResolvedValue(makeSession("user-1"));
    const handler = makeHandler(NextResponse.json({ data: "appointments" }));

    const wrapped = withAuth(handler);
    const response = await wrapped(makeRequest(), makeParams("abc"));

    expect(mockAuth).toHaveBeenCalled();
    expect(handler).toHaveBeenCalledWith(makeRequest(), {
      session: makeSession("user-1"),
      params: { id: "abc" },
    });
    const body = await response.json();
    expect(body).toEqual({ data: "appointments" });
  });

  it("returns 401 when auth() returns null", async () => {
    mockAuth.mockResolvedValue(null);
    const handler = makeHandler();

    const wrapped = withAuth(handler);
    const response = await wrapped(makeRequest());

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: "No autenticado" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns 401 when session.user.id is missing", async () => {
    mockAuth.mockResolvedValue({ user: { id: "", name: "Test" } });
    const handler = makeHandler();

    const wrapped = withAuth(handler);
    const response = await wrapped(makeRequest());

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: "No autenticado" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("forwards params from context to handler", async () => {
    mockAuth.mockResolvedValue(makeSession("user-1"));
    const handler = makeHandler();

    const wrapped = withAuth(handler);
    await wrapped(makeRequest("/api/patients/xyz-789"), makeParams("xyz-789"));

    expect(handler).toHaveBeenCalledWith(
      expect.any(NextRequest),
      expect.objectContaining({ params: { id: "xyz-789" } })
    );
  });

  it("delegates handler errors to handleServiceError", async () => {
    mockAuth.mockResolvedValue(makeSession("user-1"));
    const handler = jest.fn().mockRejectedValue(new NotFoundError("no encontrado"));

    const wrapped = withAuth(handler);
    const response = await wrapped(makeRequest());

    expect(response.status).toBe(404);
  });

  it("returns 403 when session role does not match required roles", async () => {
    mockAuth.mockResolvedValue(makeSession("user-1", "DENTIST"));
    const handler = makeHandler();

    const wrapped = withAuth(handler, { roles: ["ADMIN"] });
    const response = await wrapped(makeRequest());

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toEqual({ error: "No tiene permiso" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("allows access when session role matches required roles", async () => {
    mockAuth.mockResolvedValue(makeSession("user-1", "ADMIN"));
    const handler = makeHandler();

    const wrapped = withAuth(handler, { roles: ["ADMIN"] });
    const response = await wrapped(makeRequest());

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalled();
  });
});

// ─── handleServiceError tests ───────────────────────────────

describe("handleServiceError", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("returns 400 with details for ZodError", () => {
    const zodIssues: ZodIssue[] = [
      {
        code: "invalid_type",
        expected: "string",
        received: "undefined",
        path: ["email"],
        message: "Required",
      },
    ];
    const error = new ZodError(zodIssues);

    const response = handleServiceError(error);

    expect(response.status).toBe(400);
    // Response body is a NextResponse — need to clone to read
    const cloned = response.clone();
    expect(cloned.json()).resolves.toEqual(
      expect.objectContaining({
        error: "Datos inválidos",
        details: expect.objectContaining({ email: ["Required"] }),
      })
    );
  });

  it("returns 404 for NotFoundError", () => {
    const response = handleServiceError(new NotFoundError("Cita no encontrada"));

    expect(response.status).toBe(404);
    expect(response.clone().json()).resolves.toEqual(
      expect.objectContaining({ error: "Cita no encontrada" })
    );
  });

  it("returns 403 for ForbiddenError", () => {
    const response = handleServiceError(
      new ForbiddenError("No tiene permiso para acceder a este recurso")
    );

    expect(response.status).toBe(403);
  });

  it("returns 409 for ConflictError", () => {
    const response = handleServiceError(
      new ConflictError("Conflicto de horario con otra cita")
    );

    expect(response.status).toBe(409);
  });

  it("returns 409 for ConflictError (pendientes)", () => {
    const response = handleServiceError(
      new ConflictError("Solo se pueden confirmar citas pendientes")
    );

    expect(response.status).toBe(409);
  });

  it("returns 409 for ConflictError (cancelada)", () => {
    const response = handleServiceError(
      new ConflictError("La cita ya está cancelada")
    );

    expect(response.status).toBe(409);
  });

  it("returns 500 for unknown errors", () => {
    const response = handleServiceError(new Error("Something random"));

    expect(response.status).toBe(500);
    expect(response.clone().json()).resolves.toEqual(
      expect.objectContaining({ error: "Error interno del servidor" })
    );
  });

  it("returns 500 for non-Error thrown values", () => {
    const response = handleServiceError("string error");

    expect(response.status).toBe(500);
  });

  it("calls console.error before returning", () => {
    const error = new Error("test error");
    handleServiceError(error);

    expect(consoleErrorSpy).toHaveBeenCalledWith(error);
  });
});
