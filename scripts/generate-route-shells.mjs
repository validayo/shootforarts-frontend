import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BASE_URL, FONT_STYLESHEET, ROUTE_SHELL_PAGES, SHARED_OG_IMAGE, SHARED_THEME_COLOR } from "./seo-pages.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const ROUTE_SHELL_BUILD_ID = Date.now().toString(36);

const APP_BOOTSTRAP_SCRIPT = String.raw`(function () {
  function injectScript(src) {
    var script = document.createElement("script");
    script.type = "module";
    script.src = src;
    document.body.appendChild(script);
  }

  function injectStyle(href) {
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  function showFallbackMessage() {
    var root = document.getElementById("root");
    if (!root) return;
    root.innerHTML =
      '<div style="min-height:60vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:Inter,Arial,sans-serif;text-align:center;color:#1f2937;">' +
      '<div><h1 style="font-family:\'Cormorant Garamond\',serif;font-size:2rem;margin-bottom:0.75rem;">Shoot For Arts</h1>' +
      "<p style=\"margin:0 0 1rem;\">The page is having trouble loading right now.</p>" +
      '<p style="margin:0;"><a href="/" style="color:#7c5c41;text-decoration:underline;">Go to home</a></p></div></div>';
  }

  fetch("/index.html?route-shell=${ROUTE_SHELL_BUILD_ID}", { cache: "no-store" })
    .then(function (response) {
      if (!response.ok) throw new Error("Failed to load app shell");
      return response.text();
    })
    .then(function (html) {
      var stylesheetPattern = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["'][^>]*>/gi;
      var stylesheetMatch;
      while ((stylesheetMatch = stylesheetPattern.exec(html)) !== null) {
        injectStyle(stylesheetMatch[1]);
      }

      var scriptMatch = html.match(/<script[^>]+type=\"module\"[^>]+src=\"([^\"]+)\"/i);
      if (!scriptMatch) throw new Error("Missing app entry script");
      injectScript(scriptMatch[1]);
    })
    .catch(function () {
      showFallbackMessage();
    });
})();`;

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const escapeAttribute = (value) => escapeHtml(value).replace(/'/g, "&#39;");

const toCanonicalUrl = (route) => `${BASE_URL}${route}`;

const toBreadcrumbSchema = (page) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: page.breadcrumbs.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: `${BASE_URL}${item.path}`,
  })),
});

const renderRobotsMeta = (robots) => (robots ? `    <meta name="robots" content="${escapeAttribute(robots)}" />\n` : "");

const renderRouteShell = (page) => {
  const canonicalUrl = toCanonicalUrl(page.route);
  const breadcrumbJson = JSON.stringify(toBreadcrumbSchema(page), null, 2);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="${escapeAttribute(SHARED_THEME_COLOR)}" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="Shoot For Arts" />
    <link rel="preconnect" href="https://obhiuvlfopgtbgjuznok.supabase.co" crossorigin />
    <link rel="dns-prefetch" href="//obhiuvlfopgtbgjuznok.supabase.co" />
    <title>${escapeHtml(page.title)}</title>
    <link rel="icon" type="image/png" sizes="512x512" href="/icons/app-icon-512.png?v=1" />
    <link rel="shortcut icon" type="image/png" href="/icons/app-icon-512.png?v=1" />
    <link rel="apple-touch-icon" sizes="512x512" href="/icons/app-icon-512.png?v=1" />
    <link rel="manifest" href="/site.webmanifest" />
    <meta name="description" content="${escapeAttribute(page.description)}" />
${renderRobotsMeta(page.robots)}    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escapeAttribute(canonicalUrl)}" />
    <meta property="og:title" content="${escapeAttribute(page.ogTitle)}" />
    <meta property="og:description" content="${escapeAttribute(page.ogDescription)}" />
    <meta property="og:site_name" content="Shoot For Arts" />
    <meta property="og:image" content="${escapeAttribute(SHARED_OG_IMAGE)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeAttribute(page.ogTitle)}" />
    <meta name="twitter:description" content="${escapeAttribute(page.ogDescription)}" />
    <meta name="twitter:image" content="${escapeAttribute(SHARED_OG_IMAGE)}" />
    <meta name="sfa-ga-measurement-id" content="" />
    <link rel="canonical" href="${escapeAttribute(canonicalUrl)}" />
    <script src="/scripts/ga-init.js"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="${escapeAttribute(FONT_STYLESHEET)}" rel="stylesheet" />
    <script type="application/ld+json">
${breadcrumbJson}
    </script>
  </head>
  <body style="margin:0;background:${escapeAttribute(page.backgroundColor)};">
    <div id="root" style="min-height:100vh;"></div>
    <script>
${APP_BOOTSTRAP_SCRIPT}
    </script>
  </body>
</html>
`;
};

for (const page of ROUTE_SHELL_PAGES) {
  const outputPath = path.resolve(root, page.outputPath);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, renderRouteShell(page), "utf8");
  console.log(`[route-shells] Wrote ${page.outputPath}`);
}
