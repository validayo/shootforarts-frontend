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

### Homepage performance stability pass

- Added Supabase image URL normalization so gallery thumbnails/full-size assets use render-image transforms consistently.
- Prioritized the first visible gallery image (`loading="eager"`, high fetch priority) and added explicit dimensions/sizes hints.
- Added `preconnect` and `dns-prefetch` hints for the Supabase image origin in route HTML shells.
- Why: reduce LCP/CLS volatility and improve real-world loading consistency without changing core site behavior.

## 2026-03-17

### Contact conversion flow

- Added a dedicated `/contact/thank-you` route and static route shell for successful contact submissions.
- Reused a shared success-state component and updated the real submit path to redirect there after a successful `contact-form` POST.
- Added a session-based thank-you access guard, kept the route `noindex,nofollow`, and left honeypot spam on the inline fake-success path.
- Added an Instagram follow CTA to the thank-you message.
- Why: create a cleaner post-submit lead experience and a safer secondary conversion destination without weakening spam handling.

### Analytics + Ads support

- Updated analytics notes to treat `generate_lead` as the primary contact conversion and `/contact/thank-you` page views as an optional secondary signal.
- Added route/SEO support for the thank-you page and tightened related robots handling.
- Why: make Google Ads/GA4 conversion setup clearer and reduce confusion around legacy contact conversion actions.

### PWA icon + public asset organization

- Added a web app manifest, Apple touch icon metadata, and dedicated app install icons under `public/icons/`.
- Repointed install/favicon metadata to the new `SA` icon assets.
- Organized loose public assets by moving GA bootstrap into `public/scripts/` and legacy logo files into `public/branding/`.
- Updated static route shells, docs, and SEO validation to match the new asset paths.
- Why: improve add-to-home-screen branding and keep the `public/` directory easier to maintain.

### Static route shell hardening

- Removed dev-only `/src/main.tsx` fallback assumptions from static route shells and replaced them with safer load-failure fallbacks.
- Restored explicit submit-state cleanup around contact submissions.
- Why: avoid broken production fallback behavior and keep the contact submit flow resilient if route behavior changes later.

### Navbar CTA + breakpoint polish

- Renamed the main public booking nav item from `contact` to `book a shoot` while keeping the route at `/contact`.
- Updated the booking nav item to stay active on `/contact/thank-you`.
- Raised the desktop-nav breakpoint so tighter tablet/small-laptop widths fall back to the mobile menu before the centered wordmark and nav can overlap.
- Why: make the primary booking action more obvious and keep the header layout stable across mid-width screens.
