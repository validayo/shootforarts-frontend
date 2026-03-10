# SEO Validation Checklist

Run:

`npm run seo:validate`

This validates:

- Title/meta description present on `index.html` and route entry pages under `public/`
- Open Graph + Twitter tags are present
- Canonical URL matches each route
- GA bootstrap script is present (`/ga-init.js`)
- `public/robots.txt` includes sitemap lines and admin disallow entry (`/sfaadmin`)

Manual checks before deploy:

1. Run `npm run build` (generates `sitemap.xml` and `sitemap-images.xml` via `postbuild`).
2. Confirm `https://shootforarts.com/robots.txt` and both sitemap URLs load in browser.
3. Use Google Search Console URL Inspection on `/`, `/about`, `/services`, `/contact`.
4. Use Rich Results Test for homepage JSON-LD and services FAQ JSON-LD.
