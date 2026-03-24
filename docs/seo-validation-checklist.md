# SEO Validation Checklist

Run:

`npm run seo:validate`

This validates:

- Title/meta description present on `index.html` and route entry pages under `public/`
- Open Graph + Twitter tags are present
- Canonical URL matches each route
- GA bootstrap script is present (`/scripts/ga-init.js`)
- `public/robots.txt` includes sitemap lines and admin disallow entry (`/sfaadmin`)

Manual checks before deploy:

1. Run `npm run build` (generates `sitemap.xml` and `sitemap-images.xml` via `postbuild`).
2. Confirm `https://shootforarts.com/robots.txt` and both sitemap URLs load in browser.
3. Confirm the initial document HTML for `/`, `/about`, `/services`, and `/contact` contains meaningful fallback body content before JS boots.
4. Confirm `/book` serves `noindex,nofollow` and is not included in the main sitemap.
5. Use Google Search Console URL Inspection on `/`, `/about`, `/services`, `/contact`.
6. Use Rich Results Test for homepage JSON-LD (`Organization`, `WebSite`, `ProfessionalService`) and services FAQ JSON-LD.
7. After deploy, request reindexing for `/`, `/about`, `/services`, and `/contact` if title/site-name updates are still stale.
