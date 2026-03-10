import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const pages = [
  { path: "index.html", canonical: "https://shootforarts.com/" },
  { path: "public/about/index.html", canonical: "https://shootforarts.com/about" },
  { path: "public/services/index.html", canonical: "https://shootforarts.com/services" },
  { path: "public/contact/index.html", canonical: "https://shootforarts.com/contact" },
];

const metaWithAttrAndContent = (attr, value) => new RegExp(`<meta(?=[^>]*${attr}=["']${value}["'])(?=[^>]*content=["'][^"']+["'])[^>]*>`, "i");

const requiredPatterns = [
  { label: "title", regex: /<title>[^<]+<\/title>/i },
  { label: "meta description", regex: metaWithAttrAndContent("name", "description") },
  { label: "og:title", regex: metaWithAttrAndContent("property", "og:title") },
  { label: "og:description", regex: metaWithAttrAndContent("property", "og:description") },
  { label: "og:image", regex: /<meta(?=[^>]*property=["']og:image["'])(?=[^>]*content=["']https?:\/\/[^"']+["'])[^>]*>/i },
  { label: "twitter:card", regex: metaWithAttrAndContent("name", "twitter:card") },
  { label: "twitter:title", regex: metaWithAttrAndContent("name", "twitter:title") },
  { label: "twitter:description", regex: metaWithAttrAndContent("name", "twitter:description") },
  { label: "GA init script", regex: /<script\s+src=["']\/ga-init\.js["']><\/script>/i },
];

let hasErrors = false;

for (const page of pages) {
  const fullPath = path.resolve(root, page.path);
  if (!fs.existsSync(fullPath)) {
    console.error(`[seo] Missing file: ${page.path}`);
    hasErrors = true;
    continue;
  }

  const html = fs.readFileSync(fullPath, "utf8");
  for (const pattern of requiredPatterns) {
    if (!pattern.regex.test(html)) {
      console.error(`[seo] ${page.path} missing ${pattern.label}`);
      hasErrors = true;
    }
  }

  const canonicalRegex = new RegExp(`<link\\s+rel=["']canonical["']\\s+href=["']${page.canonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`, "i");
  if (!canonicalRegex.test(html)) {
    console.error(`[seo] ${page.path} has unexpected canonical (expected ${page.canonical})`);
    hasErrors = true;
  }
}

const robotsPath = path.resolve(root, "public/robots.txt");
if (!fs.existsSync(robotsPath)) {
  console.error("[seo] Missing file: public/robots.txt");
  hasErrors = true;
} else {
  const robots = fs.readFileSync(robotsPath, "utf8");
  const requiredRobotsLines = [
    "Sitemap: https://shootforarts.com/sitemap.xml",
    "Sitemap: https://shootforarts.com/sitemap-images.xml",
    "Disallow: /sfaadmin",
  ];
  for (const line of requiredRobotsLines) {
    if (!robots.includes(line)) {
      console.error(`[seo] public/robots.txt missing "${line}"`);
      hasErrors = true;
    }
  }
}

if (hasErrors) {
  console.error("[seo] Validation failed.");
  process.exit(1);
}

console.log("[seo] Validation passed.");
