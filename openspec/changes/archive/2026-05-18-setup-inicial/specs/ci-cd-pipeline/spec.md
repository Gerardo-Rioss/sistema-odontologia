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

### Requirement: Vercel Deploy Placeholder

The pipeline SHOULD include a documented deploy step skeleton for future activation.

#### Scenario: Deploy step is present but inactive

- GIVEN the CI workflow file exists at `.github/workflows/ci.yml`
- WHEN the deploy job section is inspected
- THEN it SHALL contain a commented block with the `amondnet/vercel-action` skeleton AND a `# TODO: Uncomment when Vercel project is configured` annotation
