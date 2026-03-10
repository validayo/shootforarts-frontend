# Admin Login Security Hardening

This is my reference for hardening `/sfaadmin/login`:

- hCaptcha challenge in frontend.
- Server-side hCaptcha token verification.
- Edge function request throttling.
- Client lockout after repeated failed attempts.

## 1) Frontend environment

I keep these values in frontend environment variables (Vercel project variables + local `.env`):

```bash
VITE_HCAPTCHA_SITE_KEY=e1aedece-66b6-42ee-a9da-9e447d849c68
VITE_ADMIN_HCAPTCHA_VERIFY_URL=https://<project-ref>.functions.supabase.co/admin-hcaptcha-verify
VITE_ADMIN_HCAPTCHA_ENFORCE_SERVER_VERIFY=true
```

Notes:

- If I do not provide `VITE_ADMIN_HCAPTCHA_VERIFY_URL`, frontend derives it from `VITE_SUPABASE_URL`.
- `VITE_ADMIN_HCAPTCHA_ENFORCE_SERVER_VERIFY` defaults to `false`; I enable it after deploying the verification function.
- Supabase Auth still receives `captchaToken` during login requests, so native Supabase captcha checks can run when configured.

## 2) Supabase secret

I set the hCaptcha secret for the function runtime with:

```bash
supabase secrets set HCAPTCHA_SECRET=<my-hcaptcha-secret>
```

## 3) Deploy verification function

Function source:

- `supabase/functions/admin-hcaptcha-verify/index.ts`

Deploy command:

```bash
supabase functions deploy admin-hcaptcha-verify --no-verify-jwt
```

`--no-verify-jwt` is intentional so unauthenticated login screens can call the endpoint.

## 4) Verify with curl

I validate function wiring before UI testing with:

```bash
curl -i -X POST "https://<project-ref>.functions.supabase.co/admin-hcaptcha-verify" \
  -H "Content-Type: application/json" \
  -d '{"token":"<hcaptcha-response-token>"}'
```

Expected:

- `200` with `{"success": true, ...}` for valid tokens.
- `403` for invalid/expired tokens.
- `429` when request throttle is exceeded.

## 5) Real brute-force protection notes

hCaptcha helps, but real brute-force resistance also needs network controls:

- I add WAF/rate-limits at CDN/edge (Cloudflare or equivalent) for:
  - `/sfaadmin/login`
  - Supabase auth token endpoint traffic.
- I keep Supabase auth and project limits configured for abusive traffic patterns.
- I monitor failed login spikes in logs/alerts.
