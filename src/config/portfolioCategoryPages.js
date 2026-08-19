import { HOME_PAGE_SEO } from "./publicPageMetadata.js";

export const PORTFOLIO_CATEGORY_PAGES = [
  {
    key: "home",
    category: "ALL",
    path: "/",
    label: "all",
    breadcrumbName: "Home",
    title: HOME_PAGE_SEO.title,
    description: HOME_PAGE_SEO.description,
    ogTitle: HOME_PAGE_SEO.ogTitle,
    ogDescription: HOME_PAGE_SEO.ogDescription,
    h1: "Shoot For Arts is a Toronto photographer for portraits, events, graduations, and creative shoots.",
    introEyebrow: null,
    introTitle: null,
    introDescription: null,
    robots: "index,follow",
    changefreq: "weekly",
    priority: "1.0",
    indexable: true,
    outputPath: null,
    sourceFiles: [
      "index.html",
      "src/pages/public/HomePage.tsx",
      "src/features/home/pages/HomePage.tsx",
      "src/features/gallery/components/Gallery.tsx",
      "src/features/gallery/components/CategoryFilter.tsx",
      "src/config/portfolioCategoryPages.js",
    ],
  },
  {
    key: "portraits",
    category: "PORTRAITS",
    path: "/portraits",
    label: "portraits",
    breadcrumbName: "Portraits",
    title: "Portrait Photographer Toronto | Shoot For Arts",
    description:
      "Portrait photography by Shoot For Arts in Toronto, featuring creative, personal and professionally photographed portrait sessions.",
    ogTitle: "Portrait Photographer Toronto | Shoot For Arts",
    ogDescription:
      "Portrait photography by Shoot For Arts in Toronto, featuring creative, personal and professionally photographed portrait sessions.",
    h1: "Portrait Photography by Shoot For Arts",
    introEyebrow: "Portfolio",
    introTitle: "Portraits",
    introDescription:
      "A focused look at portrait work by Shoot For Arts, from personal sessions to polished creative imagery in Toronto.",
    robots: "index,follow",
    changefreq: "weekly",
    priority: "0.9",
    indexable: true,
    outputPath: "public/portraits/index.html",
    sourceFiles: [
      "src/pages/public/HomePage.tsx",
      "src/features/home/pages/HomePage.tsx",
      "src/features/gallery/components/Gallery.tsx",
      "src/features/gallery/components/CategoryFilter.tsx",
      "src/config/portfolioCategoryPages.js",
    ],
  },
  {
    key: "events",
    category: "EVENTS",
    path: "/events",
    label: "events",
    breadcrumbName: "Events",
    title: "Event Photographer Toronto | Shoot For Arts",
    description:
      "Toronto event photography by Shoot For Arts for conferences, professional events, celebrations, cultural events and community gatherings.",
    ogTitle: "Event Photographer Toronto | Shoot For Arts",
    ogDescription:
      "Toronto event photography by Shoot For Arts for conferences, professional events, celebrations, cultural events and community gatherings.",
    h1: "Event Photography by Shoot For Arts",
    introEyebrow: "Portfolio",
    introTitle: "Events",
    introDescription:
      "A curated event gallery featuring conferences, celebrations, community moments, and professional coverage with a clean storytelling style.",
    robots: "index,follow",
    changefreq: "weekly",
    priority: "0.9",
    indexable: true,
    outputPath: "public/events/index.html",
    sourceFiles: [
      "src/pages/public/HomePage.tsx",
      "src/features/home/pages/HomePage.tsx",
      "src/features/gallery/components/Gallery.tsx",
      "src/features/gallery/components/CategoryFilter.tsx",
      "src/config/portfolioCategoryPages.js",
    ],
  },
  {
    key: "weddings",
    category: "WEDDINGS",
    path: "/weddings",
    label: "weddings",
    breadcrumbName: "Weddings",
    title: "Wedding Photographer Toronto | Shoot For Arts",
    description:
      "Wedding photography by Shoot For Arts, capturing celebrations, portraits and meaningful moments with a natural visual storytelling approach.",
    ogTitle: "Wedding Photographer Toronto | Shoot For Arts",
    ogDescription:
      "Wedding photography by Shoot For Arts, capturing celebrations, portraits and meaningful moments with a natural visual storytelling approach.",
    h1: "Wedding Photography by Shoot For Arts",
    introEyebrow: "Portfolio",
    introTitle: "Weddings",
    introDescription:
      "A wedding-focused collection highlighting celebrations, portraits, and the kind of in-between moments that shape the day.",
    robots: "index,follow",
    changefreq: "weekly",
    priority: "0.9",
    indexable: true,
    outputPath: "public/weddings/index.html",
    sourceFiles: [
      "src/pages/public/HomePage.tsx",
      "src/features/home/pages/HomePage.tsx",
      "src/features/gallery/components/Gallery.tsx",
      "src/features/gallery/components/CategoryFilter.tsx",
      "src/config/portfolioCategoryPages.js",
    ],
  },
];

export const GALLERY_FILTER_ITEMS = [
  { category: "ALL", label: "all", path: "/" },
  { category: "PORTRAITS", label: "portraits", path: "/portraits" },
  { category: "EVENTS", label: "events", path: "/events" },
  { category: "WEDDINGS", label: "weddings", path: "/weddings" },
  { category: "EXTRAS", label: "extras", path: null },
];

export const INDEXABLE_PORTFOLIO_CATEGORY_PAGES = PORTFOLIO_CATEGORY_PAGES.filter((page) => page.indexable);

export function getPortfolioCategoryPageByPath(pathname) {
  return PORTFOLIO_CATEGORY_PAGES.find((page) => page.path === pathname) ?? PORTFOLIO_CATEGORY_PAGES[0];
}

export function getPortfolioCategoryPageByCategory(category) {
  return PORTFOLIO_CATEGORY_PAGES.find((page) => page.category === category) ?? PORTFOLIO_CATEGORY_PAGES[0];
}

export function getPortfolioCategoryPath(category) {
  return getPortfolioCategoryPageByCategory(category).path;
}

export function isPortfolioCategoryPath(pathname) {
  return PORTFOLIO_CATEGORY_PAGES.some((page) => page.path === pathname);
}
