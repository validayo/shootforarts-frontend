import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const BASE_URL = 'https://www.shootforarts.com';

const exists = (p) => {
  try { fs.accessSync(p, fs.constants.F_OK); return true; } catch { return false; }
};

const isoDateOnly = (d) => d.toISOString().slice(0, 10);

function getFileLastMod(filePath) {
  try {
    const out = execSync(`git log -1 --format=%cI -- "${filePath}"`, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    if (out) return new Date(out);
  } catch {}
  try {
    const stat = fs.statSync(filePath);
    return stat.mtime;
  } catch {}
  return new Date();
}

function getLastModFromFiles(files) {
  let latest = new Date(0);
  for (const rel of files) {
    const full = path.resolve(root, rel);
    if (!exists(full)) continue;
    const d = getFileLastMod(full);
    if (d > latest) latest = d;
  }
  if (+latest === 0) latest = new Date();
  return isoDateOnly(latest);
}

function generateSitemap() {
  const pages = [
    { loc: `${BASE_URL}/`, files: ['src/pages/HomePage.tsx', 'index.html'], changefreq: 'weekly', priority: '1.0' },
    { loc: `${BASE_URL}/about`, files: ['src/pages/AboutPage.tsx', 'public/about/index.html', 'src/components/About.tsx'], changefreq: 'monthly', priority: '0.8' },
    { loc: `${BASE_URL}/services`, files: ['src/pages/ServicesPage.tsx', 'public/services/index.html'], changefreq: 'weekly', priority: '0.9' },
    { loc: `${BASE_URL}/contact`, files: ['src/pages/ContactPage.tsx', 'public/contact/index.html', 'src/components/ContactForm.tsx'], changefreq: 'weekly', priority: '0.9' },
  ];

  const urls = pages.map(p => ({ ...p, lastmod: getLastModFromFiles(p.files) }));

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(u => (
      [
        '  <url>',
        `    <loc>${u.loc}</loc>`,
        `    <lastmod>${u.lastmod}</lastmod>`,
        `    <changefreq>${u.changefreq}</changefreq>`,
        `    <priority>${u.priority}</priority>`,
        '  </url>'
      ].join('\n')
    )),
    '</urlset>',
    ''
  ].join('\n');

  const outPath = path.resolve(root, 'public', 'sitemap.xml');
  fs.writeFileSync(outPath, xml);
  console.log('[sitemap] Wrote', outPath);
}

function extractHomeOgImage() {
  const idxPath = path.resolve(root, 'index.html');
  if (!exists(idxPath)) return null;
  const html = fs.readFileSync(idxPath, 'utf8');
  const m = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

function extractHomeOgTitleDesc() {
  const idxPath = path.resolve(root, 'index.html');
  if (!exists(idxPath)) return { title: null, desc: null };
  const html = fs.readFileSync(idxPath, 'utf8');
  const t = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
  const d = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
  return { title: t ? t[1] : null, desc: d ? d[1] : null };
}

function extractAboutImage() {
  const aboutComp = path.resolve(root, 'src', 'components', 'About.tsx');
  if (!exists(aboutComp)) return null;
  const src = fs.readFileSync(aboutComp, 'utf8');
  const m = src.match(/src=\"([^\"]*AYO\.(?:jpg|jpeg|png))\"/i);
  return m ? m[1] : null;
}

function extractServiceImages() {
  const svcPath = path.resolve(root, 'src', 'pages', 'ServicesPage.tsx');
  if (!exists(svcPath)) return [];
  const txt = fs.readFileSync(svcPath, 'utf8');
  const start = txt.indexOf('const categoryImages');
  if (start === -1) return [];
  const end = txt.indexOf('};', start);
  const block = end !== -1 ? txt.slice(start, end) : txt.slice(start);
  const images = [];
  const re = /(base|creative|prom|grad|event|wedding)\s*:\s*\"(https?:[^\"]+)\"/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    images.push({ key: m[1], url: m[2] });
  }
  return images;
}

function generateImageSitemap() {
  const urls = [];
  const homeImg = extractHomeOgImage();
  const homeTD = extractHomeOgTitleDesc();
  if (homeImg) {
    urls.push({ loc: `${BASE_URL}/`, images: [{ loc: homeImg, title: homeTD.title || 'Shoot For Arts - Life is better with cherished memories.', caption: homeTD.desc || 'Visual storytelling through portraits, events, and creative shoots.' }] });
  }
  const aboutImg = extractAboutImage();
  if (aboutImg) {
    urls.push({ loc: `${BASE_URL}/about`, images: [{ loc: aboutImg, title: 'About Ayo — Shoot For Arts', caption: 'Ayo, photographer and creator of Shoot For Arts.' }] });
  }
  const svcImages = extractServiceImages();
  if (svcImages.length) {
    urls.push({ loc: `${BASE_URL}/services`, images: svcImages.map(i => ({ loc: i.url, title: i.key })) });
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...urls.map(u => (
      [
        '  <url>',
        `    <loc>${u.loc}</loc>`,
        ...u.images.map(img => (
          [
            '    <image:image>',
            `      <image:loc>${img.loc}</image:loc>`,
            img.title ? `      <image:title>${escapeXml(img.title)}</image:title>` : null,
            img.caption ? `      <image:caption>${escapeXml(img.caption)}</image:caption>` : null,
            '    </image:image>'
          ].filter(Boolean).join('\n')
        )),
        '  </url>'
      ].join('\n')
    )),
    '</urlset>',
    ''
  ].join('\n');

  const outPath = path.resolve(root, 'public', 'sitemap-images.xml');
  fs.writeFileSync(outPath, xml);
  console.log('[sitemap-images] Wrote', outPath);
}

function escapeXml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

generateSitemap();
generateImageSitemap();
