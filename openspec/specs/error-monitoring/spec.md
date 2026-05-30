# error-monitoring Specification

## Purpose

Sentry error monitoring across all Next.js runtimes (client, server, edge) with source maps and error boundaries.

## Requirements

### Requirement: Sentry SDK Integration

The system MUST initialize Sentry in `src/instrumentation.ts` for server and edge runtimes. Client-side initialization SHALL use a separate Sentry client config.

| Runtime | Config File | Init Point |
|---------|------------|------------|
| Server | `src/lib/sentry.server.ts` | `instrumentation.ts` |
| Edge | `src/lib/sentry.edge.ts` | `instrumentation.ts` |
| Client | `src/lib/sentry.client.ts` | `layout.tsx` or root client component |

#### Scenario: Unhandled server error is captured

- GIVEN Sentry is initialized in `instrumentation.ts`
- WHEN an unhandled exception occurs in a server-side route
- THEN the error SHALL be reported to Sentry with stack trace AND request context

#### Scenario: Client-side error is captured

- GIVEN Sentry client config is initialized
- WHEN a React component throws an unhandled error
- THEN the error SHALL be reported to Sentry with component stack trace

#### Scenario: Sentry disabled via env variable

- GIVEN `SENTRY_ENABLED=false` is set
- WHEN the application initializes
- THEN Sentry SDK SHALL NOT be loaded AND no errors SHALL be reported

### Requirement: Source Maps Upload

The system MUST upload source maps to Sentry during build when `SENTRY_AUTH_TOKEN` is configured.

#### Scenario: Source maps uploaded on production build

- GIVEN `SENTRY_AUTH_TOKEN` and `SENTRY_ORG` are set
- WHEN `npm run build` executes in production
- THEN source maps SHALL be uploaded to Sentry AND stripped from the public bundle

### Requirement: Error Boundary Component

The system SHOULD include a React error boundary component to prevent full-page crashes and report caught errors to Sentry.

#### Scenario: Error boundary catches render error

- GIVEN an error boundary wraps a page component
- WHEN a child component throws during render
- THEN the error boundary SHALL display a fallback UI AND report the error to Sentry
