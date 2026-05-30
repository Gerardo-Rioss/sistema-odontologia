# seo-metadata Specification

## Purpose

Per-page Next.js Metadata, sitemap.xml, and robots.txt.

## Requirements

### Requirement: Per-Page Metadata

All 10 pages SHALL export `metadata` with `title` and `description`. Client-only pages MUST place metadata in a sibling `layout.tsx`.

#### Scenario: Metadata present on all routes

- GIVEN production build
- WHEN inspecting any page `<head>`
- THEN `<title>` and `<meta name="description">` present with non-empty content

### Requirement: Sitemap

`app/sitemap.ts` SHALL generate `sitemap.xml` at build time with `url`, `lastModified`, `changeFrequency`, `priority` for all public routes. Dashboard and API routes MUST be excluded.

#### Scenario: Sitemap generated

- WHEN visiting `/sitemap.xml`
- THEN XML lists all public pages; `/dashboard/` and `/api/` absent

### Requirement: Robots

`app/robots.ts` SHALL serve `robots.txt` allowing all crawlers on `/` and disallowing `/dashboard/` and `/api/`.

#### Scenario: Robots served

- WHEN visiting `/robots.txt`
- THEN response: `Allow: /`, `Disallow: /dashboard/`, `Disallow: /api/`
