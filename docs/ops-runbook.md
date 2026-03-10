# Ops Runbook

Operational checklist I use for shipping, monitoring, and recovering the Shoot For Arts frontend.

## 1) Ownership

- Product owner: Shoot For Arts
- Frontend runtime: Vercel
- Data/auth/storage: Supabase
- Domain/DNS: Porkbun
- Email provider (transactional/inbox): iCloud custom domain

## 2) Release Checklist (Before Merge/Deploy)

I run locally:

```bash
npm run lint
npm run typecheck
npm run build
npm run test
npm run seo:validate
npm run test:e2e:smoke
```

I confirm:

- CI is green (`quality`, `e2e-smoke`).
- Public sitemap files were generated during build.
- Admin routes are only under `/sfaadmin/*`.
- Contact form submits and shows success state.

## 3) Deploy Flow

1. Merge to `main`.
2. I verify GitHub Actions checks pass.
3. I confirm Vercel preview/build completes.
4. I validate production pages:
   - `/`
   - `/services`
   - `/contact`
   - `/sfaadmin/login`

## 4) Rollback Procedure

1. In Vercel, I identify last known-good deployment.
2. I promote that deployment to production.
3. I open an incident note (what failed, start time, impacted surface).
4. I create a fix branch and re-run full validation before re-promoting.

## 5) Incident Playbooks

### Contact Form Failures

Symptoms:
- Form fails with generic error.
- Backend endpoint times out or returns non-2xx.

What I check:
1. I check browser console/network for `POST /contact-form`.
2. I check Edge Function/service logs.
3. I confirm `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set correctly.
4. If backend outage persists, I place a temporary message on the contact page and monitor.

### Admin Login/Session Issues

Symptoms:
- Redirect loop to login.
- Authenticated admin cannot access `/sfaadmin/dashboard`.

What I check:
1. I verify Supabase auth status.
2. I confirm site env values in Vercel.
3. I check token/session errors in browser console.
4. I validate route guards and redirects still point to `/sfaadmin/login`.

### Gallery/Upload Failures

Symptoms:
- Images do not load.
- Admin upload stalls or returns unauthorized.

What I check:
1. I verify storage bucket access and RLS policies.
2. I confirm upload backend is healthy (`VITE_UPLOAD_BASE`).
3. I re-test with a small image file and inspect network response.

## 6) Monthly Maintenance

- Review and prune stale admin accounts in Supabase.
- Verify backups/export strategy for critical tables.
- Re-run smoke E2E against production manually.
- Check robots/sitemaps/canonical tags via `npm run seo:validate`.
- Review dependency updates and security advisories.

## 7) Newsletter Readiness (When Enabled)

- Ensure SPF, DKIM, and DMARC DNS records are in place.
- Store subscriber status fields (`subscribed`, `unsubscribed_at`).
- Include unsubscribe link in every broadcast.
- Honor unsubscribe immediately (CASL safe baseline).

## 8) Related Security Docs

- I keep `docs/admin-login-security.md` as the source of truth for captcha verification and login hardening.
