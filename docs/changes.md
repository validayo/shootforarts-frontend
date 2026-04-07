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

## 2026-03-23

### Ads landing page + booking flow

- Added a dedicated `/book` route and static route shell for paid traffic while leaving the homepage focused on portfolio/brand browsing.
- Built `/book` as a conversion-first landing page with a simplified hero, trust sections, curated top-ranked work, packages, reviews, and direct booking form.
- Kept `/book` on the shared booking backend and the shared `/contact/thank-you` success flow instead of introducing a second lead pipeline.
- Marked `/book` as `noindex,nofollow`.
- Why: separate ad-click behavior from portfolio browsing without duplicating booking logic.

### `/book` content sourcing + analytics

- Updated the landing page work strip to use the existing `is_top` / `top_rank` metadata and show the top 6 ranked photos.
- Added dedicated `/book` CTA tracking via `book_landing_cta_click`.
- Kept successful landing-page submissions on the existing `generate_lead` + `contact_submit` path, segmented with `source=book_landing_form`.
- Added `book_form_blocked` for minimum-fill-time, cooldown, validation, and required-field failures.
- Why: keep conversion reporting clean while preserving one primary lead event for GA4/Ads.

### SEO + crawler-first HTML consistency

- Added semantic fallback body content to the homepage and core public route shells so first-hit HTML is no longer effectively empty before the SPA boots.
- Strengthened the homepage title to a clearer brand + primary-service format.
- Added a real homepage `h1` and changed the centered navbar brand mark from heading markup to plain text.
- Added consistent `og:site_name` handling at the route SEO layer.
- Updated homepage structured data to use the current app icon as the brand logo and added `ProfessionalService` schema for Toronto photography.
- Why: improve crawlability, reduce title/site-name ambiguity, and strengthen local search signals.

## 2026-04-02

### SEO-only metadata cleanup

- Removed `meta keywords` usage from the shared React SEO component and from the public route shells.
- Rewrote title/description/OG copy for `/`, `/about`, `/services`, `/contact`, and `/book` to better reflect the current target mix: portraits, headshots, branding, graduations, and events.
- Tightened homepage structured data with clearer `Organization`, `WebSite`, and `ProfessionalService` signals plus stronger branded-name consistency for `Shoot For Arts`.
- Why: improve modern search relevance and branded-query clarity without touching the public page layouts.

### Route shell flash removal

- Reworked the homepage and route-shell HTML so the shipped shell keeps SEO metadata but no longer paints visible preview content before React boots.
- Kept the shell bootstrap/fallback behavior for load-failure safety while making the default first paint visually neutral.
- Why: remove the brief HTML preview flash while preserving crawlable metadata for the main public routes.

### Canonical + duplicate URL cleanup

- Added permanent redirects for `/index.html` and each public route’s `/index.html` variant to its clean canonical path in `vercel.json`.
- Kept the pretty route rewrites in place for `/about`, `/services`, `/contact`, `/book`, and `/contact/thank-you`.
- Why: consolidate duplicate URL signals and reduce the chance of Google indexing `index.html` variants separately.

### SEO tooling alignment

- Added route-shell generation to `prebuild` and a dedicated `seo:generate` script.
- Updated sitemap generation and SEO validation to read from the shared route-shell config instead of hardcoded page lists.
- Why: keep route shell metadata, sitemap output, and validation rules in sync as SEO settings evolve.

## 2026-04-07

### `/book` conversion copy tightening

- Reworked the `/book` hero to lead with local search intent and pricing clarity: `Book a Toronto photoshoot starting at $100`.
- Added a trust line under the main hero headline: `Trusted by 50+ clients across Toronto`.
- Replaced the softer `/book` CTA language with `Check Availability & Lock Your Date` in the hero, form, and closing CTA.
- Added friction-reduction and commitment-reduction copy directly under the main CTA:
  `Only a small deposit needed to secure your shoot` and `Takes 1 minute. No commitment.`
- Why: make paid and search traffic understand the offer faster and push more visitors toward immediate inquiry instead of passive browsing.

### `/book` urgency + package clarity pass

- Added a concrete pricing snapshot near the top of `/book` showing portrait, grad, and event package examples with actual deliverables and prices from the services content.
- Replaced vague package summary cards with clearer deliverables so visitors can see what each tier actually includes before they reach the form.
- Swapped the stale hardcoded booking message for dynamic current/next-month booking copy plus a stronger limited-availability signal.
- Added `Spots for April are almost full` above the booking form and aligned the form heading with the stronger lock-your-date CTA.
- Surfaced the deposit requirement more prominently around both the hero and form, and made the direct phone/text option more visible inside the form.
- Why: reduce decision friction, increase urgency, and answer the highest-conversion booking questions earlier on the page.
