import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BASE_URL, INDEXABLE_ROUTE_SHELL_PAGES, ROUTE_SHELL_PAGES } from "./seo-pages.mjs";
import { getPortfolioCategoryPageByPath } from "../src/config/portfolioCategoryPages.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const homePage = getPortfolioCategoryPageByPath("/");

const pages = [
  {
    path: "index.html",
    canonical: `${BASE_URL}/`,
    title: homePage.title,
    description: homePage.description,
    ogTitle: homePage.ogTitle,
    ogDescription: homePage.ogDescription,
    ogUrl: `${BASE_URL}/`,
    robots: homePage.robots,
  },
  ...ROUTE_SHELL_PAGES.map((page) => ({
    path: page.outputPath,
    canonical: `${BASE_URL}${page.route}`,
    title: page.title,
    description: page.description,
    ogTitle: page.ogTitle,
    ogDescription: page.ogDescription,
    ogUrl: `${BASE_URL}${page.route}`,
    robots: page.robots,
  })),
];

const metaWithAttrAndContent = (attr, value) => new RegExp(`<meta(?=[^>]*${attr}=["']${value}["'])(?=[^>]*content=["'][^"']+["'])[^>]*>`, "i");
const decodeHtml = (value) =>
  String(value)
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

const extractTitle = (html) => {
  const match = html.match(/<title>([\s\S]*?)<\/title>/i);
  return match ? decodeHtml(match[1].trim()) : null;
};

const extractMetaContent = (html, attr, value) => {
  const regex = new RegExp(
    `<meta(?=[^>]*${attr}=["']${value}["'])(?=[^>]*content=["']([^"']+)["'])[^>]*>`,
    "i"
  );
  const match = html.match(regex);
  return match?.[1] ? decodeHtml(match[1]) : null;
};

const requiredPatterns = [
  { label: "title", regex: /<title>[^<]+<\/title>/i },
  { label: "meta description", regex: metaWithAttrAndContent("name", "description") },
  { label: "og:title", regex: metaWithAttrAndContent("property", "og:title") },
  { label: "og:description", regex: metaWithAttrAndContent("property", "og:description") },
  { label: "og:image", regex: /<meta(?=[^>]*property=["']og:image["'])(?=[^>]*content=["']https?:\/\/[^"']+["'])[^>]*>/i },
  { label: "twitter:card", regex: metaWithAttrAndContent("name", "twitter:card") },
  { label: "twitter:title", regex: metaWithAttrAndContent("name", "twitter:title") },
  { label: "twitter:description", regex: metaWithAttrAndContent("name", "twitter:description") },
  { label: "theme-color", regex: metaWithAttrAndContent("name", "theme-color") },
  { label: "manifest link", regex: /<link\s+rel=["']manifest["']\s+href=["']\/site\.webmanifest["']/i },
  { label: "GA init script", regex: /<script\s+src=["']\/scripts\/ga-init\.js["']><\/script>/i },
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

  if (page.title && extractTitle(html) !== page.title) {
    console.error(`[seo] ${page.path} has unexpected title`);
    hasErrors = true;
  }

  if (page.description && extractMetaContent(html, "name", "description") !== page.description) {
    console.error(`[seo] ${page.path} has unexpected meta description`);
    hasErrors = true;
  }

  if (page.ogTitle && extractMetaContent(html, "property", "og:title") !== page.ogTitle) {
    console.error(`[seo] ${page.path} has unexpected og:title`);
    hasErrors = true;
  }

  if (page.ogDescription && extractMetaContent(html, "property", "og:description") !== page.ogDescription) {
    console.error(`[seo] ${page.path} has unexpected og:description`);
    hasErrors = true;
  }

  if (page.ogUrl && extractMetaContent(html, "property", "og:url") !== page.ogUrl) {
    console.error(`[seo] ${page.path} has unexpected og:url`);
    hasErrors = true;
  }

  if (page.robots && extractMetaContent(html, "name", "robots") !== page.robots) {
    console.error(`[seo] ${page.path} has unexpected robots directive`);
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

const sitemapPath = path.resolve(root, "public/sitemap.xml");
if (!fs.existsSync(sitemapPath)) {
  console.error("[seo] Missing file: public/sitemap.xml");
  hasErrors = true;
} else {
  const sitemap = fs.readFileSync(sitemapPath, "utf8");
  const expectedLocs = [`${BASE_URL}/`, ...INDEXABLE_ROUTE_SHELL_PAGES.map((page) => `${BASE_URL}${page.route}`)];
  const actualLocs = Array.from(sitemap.matchAll(/<loc>(https:\/\/shootforarts\.com\/[^<]*)<\/loc>/g)).map((match) => match[1]);
  for (const loc of expectedLocs) {
    if (!sitemap.includes(`<loc>${loc}</loc>`)) {
      console.error(`[seo] public/sitemap.xml missing ${loc}`);
      hasErrors = true;
    }
  }
  if (actualLocs.length !== expectedLocs.length || actualLocs.some((loc) => !expectedLocs.includes(loc))) {
    console.error("[seo] public/sitemap.xml contains unexpected canonical URLs");
    hasErrors = true;
  }
}

if (hasErrors) {
  console.error("[seo] Validation failed.");
  process.exit(1);
}

console.log("[seo] Validation passed.");
