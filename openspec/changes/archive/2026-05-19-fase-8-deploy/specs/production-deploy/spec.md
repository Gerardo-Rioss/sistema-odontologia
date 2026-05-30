# production-deploy Specification

## Purpose

Automated Vercel deployment pipeline with environment templates, pre-deploy checklist, and documented rollback.

## Requirements

### Requirement: Vercel Production Deploy

The system MUST deploy to Vercel on push to `main` after CI quality gates pass. The deploy job SHALL run `npx prisma migrate deploy` before the Vercel deployment.

| Config | Value |
|--------|-------|
| Trigger | push to `main` after CI passes |
| Provider | Vercel via `amondnet/vercel-action` |
| Migration | `npx prisma migrate deploy` |
| `vercel.json` | Security headers (CSP, HSTS), CORS, region `iad1` |

#### Scenario: Push to main triggers deploy

- GIVEN code is pushed to `main` AND lint, type-check, and build pass
- WHEN the deploy job executes
- THEN Vercel SHALL deploy the production build AND Prisma migrations SHALL be applied

#### Scenario: Deploy fails and rolls back

- GIVEN a Vercel deploy fails
- WHEN the failure is detected
- THEN Vercel SHALL auto-revert to the last successful deploy AND the CI deploy job SHALL report failure

### Requirement: Production Environment Template

The system MUST provide `.env.production` listing all required variables with inline documentation and safe placeholder values.

#### Scenario: Developer consults production env template

- GIVEN `.env.production` exists in the repository root
- WHEN a developer reads it for production setup
- THEN every required variable SHALL have an inline comment AND a placeholder value

### Requirement: Pre-Deploy Checklist

The system MUST include a `DEPLOYMENT.md` with a verifiable checklist covering tests, build, migrations, and environment variables.

#### Scenario: Operator verifies checklist before deploy

- GIVEN the checklist in `DEPLOYMENT.md`
- WHEN the operator verifies all mandatory items
- THEN deploy SHALL only proceed when every item passes

### Requirement: Rollback Procedure

`DEPLOYMENT.md` SHALL document concrete rollback: revert commit, `prisma migrate resolve --rolled-back`, restore Railway backup.

#### Scenario: Production incident triggers rollback

- GIVEN a deploy causes a production incident
- WHEN the operator follows the documented rollback steps
- THEN the system SHALL return to the last known-good state
