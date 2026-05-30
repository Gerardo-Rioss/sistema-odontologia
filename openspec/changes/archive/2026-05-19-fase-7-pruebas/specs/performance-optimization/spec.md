# performance-optimization Specification

## Purpose

React render optimization: memoization, code splitting, Next.js Image.

## Requirements

### Requirement: Component Memoization

StatsCard, StatusBadge, EmptyState, Spinner SHALL use `React.memo`. Only components with stable props MAY be memoized.

#### Scenario: Memoized components skip re-renders

- GIVEN parent re-renders with same props
- THEN memoized components do not re-execute

### Requirement: Dynamic Import

Recharts SHALL be imported via `next/dynamic` with `{ssr: false}`.

#### Scenario: Recharts excluded from server bundle

- GIVEN production build
- THEN recharts absent from server chunk; charts render on client

### Requirement: Next.js Image

All static images SHALL use `next/image` with `priority` on above-fold images.

#### Scenario: Images optimized

- GIVEN any page with static images
- THEN images use `<Image>` with dimensions; no Lighthouse image warnings
