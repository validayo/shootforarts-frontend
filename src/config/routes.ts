export const ROUTES = {
  public: {
    home: "/",
    book: "/book",
    about: "/about",
    services: "/services",
    contact: "/contact",
    contactThankYou: "/contact/thank-you",
  },
  admin: {
    base: "/sfaadmin",
    login: "/sfaadmin/login",
    dashboard: "/sfaadmin/dashboard",
    assistant: "/sfaadmin/assistant",
    calendar: "/sfaadmin/calendar",
    calendarAlias: "/sfaadmin/calender",
    upload: "/sfaadmin/upload",
    galleryManager: "/sfaadmin/gallery-manager",
  },
} as const;

export const isAdminRoutePath = (pathname: string): boolean =>
  pathname === ROUTES.admin.base || pathname.startsWith(`${ROUTES.admin.base}/`);

const NO_INDEX_PUBLIC_ROUTES = new Set<string>([ROUTES.public.book, ROUTES.public.contactThankYou]);

export const shouldNoIndexRoutePath = (pathname: string): boolean =>
  isAdminRoutePath(pathname) || NO_INDEX_PUBLIC_ROUTES.has(pathname);
