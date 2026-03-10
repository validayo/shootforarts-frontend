import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Calendar as CalendarIcon, Image, LogOut, Menu, Upload, Users, X } from "lucide-react";
import { ROUTES } from "../../config/routes";

type AdminNavKey = "dashboard" | "calendar" | "upload" | "gallery";

interface AdminShellLayoutProps {
  title: string;
  subtitle: string;
  activeNav: AdminNavKey;
  onLogout: () => void | Promise<void>;
  children: React.ReactNode;
}

const navItems: Array<{
  key: AdminNavKey;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: "dashboard", label: "Dashboard", href: ROUTES.admin.dashboard, icon: Users },
  { key: "calendar", label: "Calendar", href: ROUTES.admin.calendar, icon: CalendarIcon },
  { key: "upload", label: "Upload", href: ROUTES.admin.upload, icon: Upload },
  { key: "gallery", label: "Gallery Manager", href: ROUTES.admin.galleryManager, icon: Image },
];

const navClasses = (isActive: boolean) =>
  `flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
    isActive ? "bg-blue-600 text-white shadow-sm" : "text-gray-700 hover:bg-gray-100"
  }`;

const AdminShellLayout: React.FC<AdminShellLayoutProps> = ({ title, subtitle, activeNav, onLogout, children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    setMobileMenuOpen(false);
    void onLogout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-gray-900 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to admin content
      </a>
      <div className="lg:flex">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-gray-200 bg-white/95 lg:flex">
          <div className="border-b border-gray-200 px-6 py-6">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-gray-500">Admin</p>
            <h1 className="mt-2 text-2xl font-semibold text-gray-900">Shoot for Arts</h1>
          </div>
          <nav className="flex-1 space-y-1 px-4 py-5">
            {navItems.map(({ key, label, href, icon: Icon }) => (
              <Link key={key} to={href} className={navClasses(activeNav === key)}>
                <Icon className="mr-3 h-4 w-4" />
                {label}
              </Link>
            ))}
            <a href="/" className="flex items-center rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-100">
              Back to Site
            </a>
          </nav>
          <div className="border-t border-gray-200 p-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-all hover:bg-red-50"
            >
              <LogOut className="mr-3 h-4 w-4" />
              Logout
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
            <div className="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-10">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500 lg:hidden">Admin</p>
                <h2 className="text-base font-semibold text-gray-900 lg:text-lg">{title}</h2>
              </div>
              <div className="flex items-center gap-3">
                <a href="/" className="hidden rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 sm:inline-flex">
                  View Site
                </a>
                <button
                  onClick={() => setMobileMenuOpen((prev) => !prev)}
                  className="inline-flex rounded-lg border border-gray-300 bg-white p-2 text-gray-700 shadow-sm hover:bg-gray-100 lg:hidden"
                  aria-label="Toggle admin navigation"
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
              <button
                type="button"
                className="absolute inset-0 bg-black/30"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
              />
              <div className="absolute right-0 top-0 h-full w-[84%] max-w-sm border-l border-gray-200 bg-white p-4 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">Navigation</p>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-lg border border-gray-300 p-1.5 text-gray-700 hover:bg-gray-100"
                    aria-label="Close mobile menu"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-1">
                  {navItems.map(({ key, label, href, icon: Icon }) => (
                    <Link
                      key={key}
                      to={href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={navClasses(activeNav === key)}
                    >
                      <Icon className="mr-3 h-4 w-4" />
                      {label}
                    </Link>
                  ))}
                  <a href="/" className="flex items-center rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-100">
                    Back to Site
                  </a>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-all hover:bg-red-50"
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          )}

          <main id="admin-main" className="px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
            <div className="mb-6 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
            </div>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminShellLayout;
