# GA4 Conversion Setup Checklist

Measurement ID in code: `G-2WZ8G4PZ88` (see `public/scripts/ga-init.js`).

## 1) Mark conversion events

In GA4 → **Admin** → **Events**, mark these as conversions:

- `generate_lead` (contact form success)
- `sign_up` (newsletter subscribe success)

Optional custom conversions:

- `contact_submit`
- `page_view` where `page_path` equals `/contact/thank-you`
- `newsletter_subscribe_success`
- `services_cta_click`
- `book_landing_cta_click`

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
- `placement` (event scope)
- `issue_type` (event scope)
- `page_path` (event scope)
- `image_index` (event scope)
- `field` (event scope)

## 3) Verify in DebugView

- Submit contact form once → expect `contact_submit` + `generate_lead` and a `page_view` for `/contact/thank-you`
- Visit `/book` → expect a `page_view` for `/book`
- Click `/book` CTAs such as `Check Availability & Lock Your Date` → expect `book_landing_cta_click`
- Trigger a blocked `/book` submit state → expect `book_form_blocked` with `reason`
- Submit `/book` form once → expect `contact_submit` + `generate_lead` with `source=book_landing_form` and a `page_view` for `/contact/thank-you`
- Click the phone/text shortcut inside the `/book` form → expect `outbound_click` + `click` with `context=book_form`
- Subscribe newsletter (footer and popup) → expect `newsletter_subscribe_success` + `sign_up`
- Click IG/email links → expect `outbound_click` + `click`
- Click Services “Book Now” → expect `service_book_now` + `select_promotion`
- Click Services bottom “Get in Touch” CTA → expect `services_cta_click` + `click`
- Open any gallery image/lightbox → expect `gallery_lightbox_open`
- Visit a missing URL (404) → expect `page_not_found`
