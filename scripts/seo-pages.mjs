export const BASE_URL = "https://shootforarts.com";
export const SHARED_OG_IMAGE =
  "https://obhiuvlfopgtbgjuznok.supabase.co/storage/v1/object/public/images/others/metadata.png";
export const SHARED_THEME_COLOR = "#7c5c41";
export const FONT_STYLESHEET =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=Inter:wght@300;400;500&display=swap";

export const ROUTE_SHELL_PAGES = [
  {
    route: "/about",
    outputPath: "public/about/index.html",
    title: "About Ayo | Shoot For Arts Toronto Photographer",
    description:
      "Meet Ayo, the Toronto photographer behind Shoot For Arts, creating portraits, headshots, branding sessions, events, and story-driven imagery.",
    ogTitle: "About Ayo | Shoot For Arts Toronto Photographer",
    ogDescription:
      "Meet Ayo, the photographer behind Shoot For Arts, known for portraits, headshots, branding sessions, events, and story-driven imagery.",
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "About", path: "/about" },
    ],
    backgroundColor: "#ffffff",
    sourceFiles: ["src/pages/public/AboutPage.tsx", "src/components/about/About.tsx"],
    changefreq: "monthly",
    priority: "0.8",
    indexable: true,
  },
  {
    route: "/services",
    outputPath: "public/services/index.html",
    title: "Toronto Photography Services | Portraits, Headshots, Branding & Events | Shoot For Arts",
    description:
      "Explore Toronto photography services from Shoot For Arts, including portraits, headshots, branding sessions, grad photos, event coverage, weddings, and creative shoots.",
    ogTitle: "Toronto Photography Services | Shoot For Arts",
    ogDescription:
      "View portraits, headshots, branding sessions, grad photos, event coverage, weddings, and creative photography packages from Shoot For Arts.",
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Services", path: "/services" },
    ],
    backgroundColor: "#ffffff",
    sourceFiles: ["src/pages/public/ServicesPage.tsx"],
    changefreq: "weekly",
    priority: "0.9",
    indexable: true,
  },
  {
    route: "/contact",
    outputPath: "public/contact/index.html",
    title: "Contact Shoot For Arts | Book a Toronto Photographer",
    description:
      "Contact Shoot For Arts to book portraits, headshots, branding sessions, grad photos, event coverage, weddings, or a custom Toronto photoshoot.",
    ogTitle: "Contact Shoot For Arts | Book a Toronto Photographer",
    ogDescription:
      "Book portraits, headshots, branding sessions, grad photos, event coverage, weddings, or a custom Toronto shoot with Shoot For Arts.",
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Contact", path: "/contact" },
    ],
    backgroundColor: "#ffffff",
    sourceFiles: ["src/pages/public/ContactPage.tsx", "src/components/contact/ContactForm.tsx"],
    changefreq: "weekly",
    priority: "0.9",
    indexable: true,
  },
  {
    route: "/book",
    outputPath: "public/book/index.html",
    title: "Book a Toronto Photographer | Shoot For Arts",
    description:
      "Book portraits, grad shoots, and event photography in Toronto with Shoot For Arts. Clear pricing, quick inquiries, and direct contact.",
    ogTitle: "Book a Toronto Photographer | Shoot For Arts",
    ogDescription:
      "Book portraits, graduations, and events directly with Shoot For Arts in Toronto.",
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Book", path: "/book" },
    ],
    backgroundColor: "#ffffff",
    sourceFiles: ["src/pages/public/BookLandingPage.tsx", "src/components/landing/BookLeadForm.tsx"],
    robots: "noindex,follow",
    indexable: false,
  },
  {
    route: "/contact/thank-you",
    outputPath: "public/contact/thank-you/index.html",
    title: "Thank You - Shoot For Arts",
    description:
      "Your inquiry has been received. Shoot For Arts will follow up shortly to confirm the next steps for your session.",
    ogTitle: "Thank You - Shoot For Arts",
    ogDescription:
      "Your inquiry has been received. Expect a follow-up shortly to confirm the next steps for your session.",
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Contact", path: "/contact" },
      { name: "Thank You", path: "/contact/thank-you" },
    ],
    backgroundColor: "#ffffff",
    sourceFiles: ["src/pages/public/ContactThankYouPage.tsx", "src/components/contact/ContactSuccessMessage.tsx"],
    robots: "noindex,follow",
    indexable: false,
  },
];

export const INDEXABLE_ROUTE_SHELL_PAGES = ROUTE_SHELL_PAGES.filter((page) => page.indexable);
