# GA4 Conversion Setup Checklist

Measurement ID in code: `G-2WZ8G4PZ88` (see `public/ga-init.js`).

## 1) Mark conversion events

In GA4 → **Admin** → **Events**, mark these as conversions:

- `generate_lead` (contact form success)
- `sign_up` (newsletter subscribe success)

Optional custom conversions:

- `contact_submit`
- `newsletter_subscribe_success`

## 2) Register custom dimensions

In GA4 → **Admin** → **Custom definitions** → **Create custom dimension**:

- `service` (event scope)
- `service_tier` (event scope)
- `source` (event scope)
- `popup_name` (event scope)
- `reason` (event scope)
- `context` (event scope)
- `link_context` (event scope)
- `destination` (event scope)

## 3) Verify in DebugView

- Submit contact form once → expect `contact_submit` + `generate_lead`
- Subscribe newsletter (footer and popup) → expect `newsletter_subscribe_success` + `sign_up`
- Click IG/email links → expect `outbound_click` + `click`
- Click Services “Book Now” → expect `service_book_now` + `select_promotion`
