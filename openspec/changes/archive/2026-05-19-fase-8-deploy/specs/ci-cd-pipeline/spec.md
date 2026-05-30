# Delta for ci-cd-pipeline

## MODIFIED Requirements

### Requirement: Vercel Production Deploy

The pipeline MUST include an active deploy job that runs on push to `main` after quality gates pass. The deploy job SHALL deploy to Vercel using `amondnet/vercel-action` AND execute `npx prisma migrate deploy` before the Vercel deployment.

(Previously: deploy step was a commented placeholder in ci.yml with a `# TODO` annotation)

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
