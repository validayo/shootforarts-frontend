export const ROUTES = {
  public: {
    home: "/",
    about: "/about",
    services: "/services",
    contact: "/contact",
  },
  admin: {
    base: "/sfaadmin",
    login: "/sfaadmin/login",
    dashboard: "/sfaadmin/dashboard",
    calendar: "/sfaadmin/calendar",
    calendarAlias: "/sfaadmin/calender",
    upload: "/sfaadmin/upload",
    galleryManager: "/sfaadmin/gallery-manager",
  },
} as const;

export const isAdminRoutePath = (pathname: string): boolean =>
  pathname === ROUTES.admin.base || pathname.startsWith(`${ROUTES.admin.base}/`);
