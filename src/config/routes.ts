import { isPortfolioCategoryPath } from "./portfolioCategoryPages.js";

export const ROUTES = {
  public: {
    home: "/",
    portraits: "/portraits",
    events: "/events",
    weddings: "/weddings",
    card: "/card",
    book: "/book",
    about: "/about",
    services: "/services",
    contact: "/contact",
    contactThankYou: "/contact/thank-you",
    invoice: "/invoice/:token",
    invoicePay: "/invoice/:token/pay",
  },
  admin: {
    base: "/sfaadmin",
    login: "/sfaadmin/login",
    dashboard: "/sfaadmin/dashboard",
    assistant: "/sfaadmin/assistant",
    contracts: "/sfaadmin/contracts",
    invoices: "/sfaadmin/invoices",
    calendar: "/sfaadmin/calendar",
    calendarAlias: "/sfaadmin/calender",
    upload: "/sfaadmin/upload",
    galleryManager: "/sfaadmin/gallery-manager",
  },
} as const;

export const isAdminRoutePath = (pathname: string): boolean =>
  pathname === ROUTES.admin.base || pathname.startsWith(`${ROUTES.admin.base}/`);

export const isPortfolioCategoryRoutePath = (pathname: string): boolean => isPortfolioCategoryPath(pathname);

export const PRIVATE_INVOICE_ROBOTS = "noindex,nofollow,noarchive,noimageindex";

export const isInvoiceRoutePath = (pathname: string): boolean => pathname.startsWith("/invoice/");

const NO_INDEX_PUBLIC_ROUTES = new Set<string>([ROUTES.public.book, ROUTES.public.contactThankYou]);

export const shouldNoIndexRoutePath = (pathname: string): boolean =>
  isAdminRoutePath(pathname) || NO_INDEX_PUBLIC_ROUTES.has(pathname) || isInvoiceRoutePath(pathname);

export const getRouteRobotsContent = (pathname: string): string =>
  isInvoiceRoutePath(pathname)
    ? PRIVATE_INVOICE_ROBOTS
    : shouldNoIndexRoutePath(pathname)
      ? "noindex,nofollow"
      : "index,follow";
