# API Middleware Specification

## Purpose

Shared higher-order functions for Next.js 14 App Router API route auth guards and service error-to-HTTP response mapping. Provides `withAuth()` and `handleServiceError()` to eliminate duplicated boilerplate across 9 route files.

## Requirements

### Requirement: withAuth() HOF Authorization

The system SHALL expose a `withAuth()` higher-order function that wraps route handlers with the NextAuth `auth()` guard, returning a 401 JSON response when no session or no `user.id` is present, and passing the session (containing `user.id` and `user.role`) to the handler.

#### Scenario: withAuth succeeds with valid session

- GIVEN a valid authenticated session exists
- WHEN the wrapped handler is invoked
- THEN `auth()` is called and returns a session
- AND the handler receives `(request, context, session)` and executes normally
- AND the handler's response is returned directly

#### Scenario: withAuth fails with no session

- GIVEN no authenticated session exists (auth() returns null/undefined)
- WHEN the wrapped handler is invoked
- THEN a 401 JSON response is returned with `error: "No autenticado"`
- AND the handler is NOT called

#### Scenario: withAuth fails with no user.id

- GIVEN a session exists but `session.user.id` is falsy
- WHEN the wrapped handler is invoked
- THEN a 401 JSON response is returned with `error: "No autenticado"`
- AND the handler is NOT called

#### Scenario: withAuth preserves Next.js route signature

- GIVEN a Next.js App Router route handler
- WHEN the handler is wrapped with `withAuth()`
- THEN the exported function signature remains compatible with `export async function GET/POST/etc.`
- AND the handler receives the standard `request` (Request) and `context` (params) arguments

### Requirement: withAuth() Error Delegation

The system SHALL wrap the handler call in a try/catch block and delegate any thrown error to `handleServiceError()`.

#### Scenario: withAuth handler throws a ZodError

- GIVEN a handler wrapped with `withAuth()`
- WHEN the handler throws a ZodError
- THEN `handleServiceError()` is invoked with the error
- AND a 400 JSON response with field validation details is returned

#### Scenario: withAuth handler throws a not-found error

- GIVEN a handler wrapped with `withAuth()`
- WHEN the handler throws an Error containing "no encontrado" in the message
- THEN `handleServiceError()` is invoked with the error
- AND a 404 JSON response is returned

### Requirement: handleServiceError() Error Mapping

The system SHALL expose a `handleServiceError(error: unknown)` function that maps service-layer errors to typed HTTP responses using message pattern matching in priority order, and logs the error via `console.error` before returning.

#### Scenario: handleServiceError maps ZodError to 400

- GIVEN the error is an instance of `ZodError` (from Zod)
- WHEN `handleServiceError()` is invoked
- THEN a 400 JSON response is returned with `error: "Datos inválidos"` and `details` containing field-level errors from the Zod issues

#### Scenario: handleServiceError maps not-found Error to 404

- GIVEN the error is an instance of `Error` whose message includes "no encontrado"
- WHEN `handleServiceError()` is invoked
- THEN a 404 JSON response is returned

#### Scenario: handleServiceError maps forbidden Error to 403

- GIVEN the error is an instance of `Error` whose message includes "No tiene permiso"
- WHEN `handleServiceError()` is invoked
- THEN a 403 JSON response is returned

#### Scenario: handleServiceError maps conflict Error to 409

- GIVEN the error is an instance of `Error` whose message includes "Conflicto de horario" OR "pendientes" OR "cancelada"
- WHEN `handleServiceError()` is invoked
- THEN a 409 JSON response is returned

#### Scenario: handleServiceError falls back to 500

- GIVEN the error does not match any of the above patterns
- WHEN `handleServiceError()` is invoked
- THEN a 500 JSON response is returned with `error: "Error interno del servidor"`

#### Scenario: handleServiceError logs before returning

- GIVEN any error is passed to `handleServiceError()`
- WHEN the function processes the error
- THEN `console.error` is called with the error before the response is returned

### Requirement: Route Refactoring Compatibility

The system SHALL allow all existing route handlers to be refactored to use `withAuth()` and `handleServiceError()` without changing external API behavior, response shapes, or HTTP status codes.

#### Scenario: Refactored appointment GET uses withAuth

- GIVEN `src/app/api/appointments/route.ts` is wrapped with `withAuth()`
- WHEN a GET request is made by an authenticated user
- THEN the same appointment list response is returned as before refactoring
- AND no auth boilerplate code exists in the handler body

#### Scenario: Refactored appointment POST uses withAuth + handleServiceError

- GIVEN `src/app/api/appointments/route.ts` POST is wrapped with `withAuth()` and catch block uses `handleServiceError()`
- WHEN a POST request is made with invalid Zod input
- THEN a 400 response with "Datos inválidos" is returned
- AND no manual error message matching exists in the route handler
