import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import RouteChangeTracker from "./components/RouteChangeTracker";
import ScrollToTop from "./components/ScrollToTop";
import ProtectedRoute from "./components/ProtectedRoute";

const Layout = lazy(() => import("./components/Layout"));
const HomePage = lazy(() => import("./pages/HomePage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const ServicesPage = lazy(() => import("./pages/ServicesPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const AdminLogin = lazy(() => import("./pages/AdminLoginPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const AdminGalleryManager = lazy(() => import("./components/AdminGalleryManager"));

// Redirect component for /admin based on auth state
const AdminIndexRedirect = () => {
  const { currentUser } = useAuth();
  return <Navigate to={currentUser ? "/admin/dashboard" : "/admin/login"} replace />;
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
        <RouteChangeTracker />
        <ScrollToTop />
        <AnimatePresence mode="wait">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route path="about" element={<AboutPage />} />
                <Route path="services" element={<ServicesPage />} />
                <Route path="contact" element={<ContactPage />} />
              </Route>

              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute>
                    <AdminPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/gallery-manager"
                element={
                  <ProtectedRoute>
                    <AdminGalleryManager />
                  </ProtectedRoute>
                }
              />

              {/* Redirect /admin -> /admin/login */}
              <Route path="/admin" element={<AdminIndexRedirect />} />

              {/* Fallback for unknown routes */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AnimatePresence>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
