# Changes

This file tracks meaningful frontend updates so I can quickly see what changed, when, and why.

## Format

- Date: `YYYY-MM-DD`
- Area
- What changed
- Why it changed

## 2026-03-10

### Admin routing + structure

- Changed admin routes to `/sfaadmin/*` and removed legacy `/admin/*` usage.
- Updated related route tracking, docs, and config references.
- Why: cleaner URLs and less obvious login route targeting.

### Contact/admin UX updates

- Added a dedicated gallery-bottom booking CTA block on the homepage with editorial styling and dual actions:
  `Start Your Inquiry` and `View Services / Pricing`.
- Refined homepage booking CTA copy/layout and improved admin shell/navigation behavior.
- Added contact form quality-of-life updates (tier reminders, inspiration links parsing, scheduling options).
- Why: stronger conversion flow and clearer admin workflows.

### Security hardening

- Added hCaptcha to admin login and wired `captchaToken` into Supabase auth login.
- Added local login lockout logic after repeated failures.
- Added optional custom hCaptcha verification path via Supabase Edge Function.
- Updated CSP for hCaptcha resources.
- Why: reduce automated login abuse and improve auth hardening.

### Reliability + accessibility

- Added global app error boundary and a proper 404 page.
- Added skip links for public and admin layouts.
- Why: better failure handling and keyboard/screen-reader navigation.

### CI quality gates

- Hardened CI with `npm ci`, concurrency control, and SEO validation.
- Split E2E into smoke/full flows and added failure artifacts.
- Added Lighthouse budget checks in CI.
- Why: prevent regressions in reliability, SEO, accessibility, and performance.

### Operations docs

- Added/updated ops runbook and admin login security notes.
- Why: keep deployment and incident handling consistent.

### Analytics coverage

- Added tracking for Services bottom CTA clicks, 404 views, admin captcha friction, and gallery lightbox opens.
- Why: clearer funnel visibility and better diagnostics for conversion blockers.
