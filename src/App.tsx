import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import RouteChangeTracker from "./components/routing/RouteChangeTracker";
import ScrollToTop from "./components/routing/ScrollToTop";
import ProtectedRoute from "./components/routing/ProtectedRoute";
import AppErrorBoundary from "./components/routing/AppErrorBoundary";
import { ROUTES } from "./config/routes";

const Layout = lazy(() => import("./components/layout/Layout"));
const HomePage = lazy(() => import("./pages/public/HomePage"));
const AboutPage = lazy(() => import("./pages/public/AboutPage"));
const ServicesPage = lazy(() => import("./pages/public/ServicesPage"));
const ContactPage = lazy(() => import("./pages/public/ContactPage"));
const NotFoundPage = lazy(() => import("./pages/public/NotFoundPage"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLoginPage"));
const AdminPage = lazy(() => import("./pages/admin/AdminPage"));
const AdminGalleryManager = lazy(() => import("./pages/admin/AdminGalleryManagerPage"));

const AdminIndexRedirect = () => {
  const { currentUser } = useAuth();
  return <Navigate to={currentUser ? ROUTES.admin.dashboard : ROUTES.admin.login} replace />;
};

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="loader" aria-label="Loading content" />
  </div>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppErrorBoundary>
          <RouteChangeTracker />
          <ScrollToTop />
          <AnimatePresence mode="wait">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<HomePage />} />
                  <Route path="about" element={<AboutPage />} />
                  <Route path="services" element={<ServicesPage />} />
                  <Route path="contact" element={<ContactPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>

                <Route path={ROUTES.admin.login} element={<AdminLogin />} />
                <Route
                  path={ROUTES.admin.dashboard}
                  element={
                    <ProtectedRoute>
                      <AdminPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.admin.calendar}
                  element={
                    <ProtectedRoute>
                      <AdminPage />
                    </ProtectedRoute>
                  }
                />
                <Route path={ROUTES.admin.calendarAlias} element={<Navigate to={ROUTES.admin.calendar} replace />} />
                <Route
                  path={ROUTES.admin.upload}
                  element={
                    <ProtectedRoute>
                      <AdminPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.admin.galleryManager}
                  element={
                    <ProtectedRoute>
                      <AdminGalleryManager />
                    </ProtectedRoute>
                  }
                />
                <Route path={ROUTES.admin.base} element={<AdminIndexRedirect />} />

                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </AnimatePresence>
        </AppErrorBoundary>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
