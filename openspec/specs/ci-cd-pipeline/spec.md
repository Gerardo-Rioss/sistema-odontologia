# CI/CD Pipeline Specification

## Purpose

Defines the continuous integration pipeline using GitHub Actions to enforce code quality gates on every push and pull request, preventing regressions before merge.

## Requirements

### Requirement: Automated Quality Gates

The system MUST run lint, type-check, and build checks on every push to `main` and every pull request targeting `main`.

| Job | Command | Pass Condition | Blocking? |
|-----|---------|---------------|-----------|
| lint | `npm run lint` | Zero ESLint errors | Yes |
| type-check | `npm run type-check` | Zero TypeScript errors | Yes |
| build | `npm run build` | Next.js build succeeds | Yes |

Jobs SHALL run in parallel. All three MUST pass for the workflow to be considered successful.

#### Scenario: Push triggers all checks

- GIVEN code is pushed to `main`
- WHEN the workflow is triggered by the push event
- THEN lint, type-check, and build jobs execute in parallel AND all three pass

#### Scenario: PR status check blocks merge

- GIVEN a pull request is opened against `main`
- WHEN CI runs the three jobs
- THEN their combined status SHALL be reported as a PR check AND a failing job SHALL block the merge

#### Scenario: ESLint error fails the pipeline

- GIVEN a PR introduces an ESLint error
- WHEN the lint job executes
- THEN the job SHALL fail with a non-zero exit code AND the PR SHALL be blocked

### Requirement: Vercel Production Deploy

The pipeline MUST include an active deploy job that runs on push to `main` after quality gates pass. The deploy job SHALL deploy to Vercel using `amondnet/vercel-action` AND execute `npx prisma migrate deploy` before the Vercel deployment.

#### Scenario: Push to main triggers deploy after quality gates

- GIVEN code is pushed to `main` AND lint, type-check, and build jobs pass
- WHEN the deploy job executes
- THEN Vercel SHALL deploy the production build AND Prisma migrations SHALL be applied

#### Scenario: Pull request does not trigger deploy

- GIVEN a pull request is opened against `main`
- WHEN CI runs quality gates on the PR
- THEN the deploy job SHALL NOT execute

#### Scenario: Migration failure blocks deploy

- GIVEN code is pushed to `main` AND quality gates pass
- WHEN `npx prisma migrate deploy` fails
- THEN the deploy job SHALL exit with failure AND Vercel SHALL NOT receive a new deployment
