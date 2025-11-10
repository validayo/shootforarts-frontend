import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import RouteChangeTracker from "./components/RouteChangeTracker";
import ScrollToTop from "./components/ScrollToTop";
import ProtectedRoute from "./components/ProtectedRoute";

// Layout
import Layout from "./components/Layout";

// Pages
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import ServicesPage from "./pages/ServicesPage";
import ContactPage from "./pages/ContactPage";
import AdminLogin from "./pages/AdminLoginPage";
import AdminPage from "./pages/AdminPage";

// Redirect component for /admin based on auth state
const AdminIndexRedirect = () => {
  const { currentUser } = useAuth();
  return <Navigate to={currentUser ? "/admin/dashboard" : "/admin/login"} replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <RouteChangeTracker />
        <ScrollToTop />
        <AnimatePresence mode="wait">
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
            <Route path="/admin/dashboard" element={ <ProtectedRoute> <AdminPage /> </ProtectedRoute> } />

            {/* Redirect /admin → /admin/login */}
            <Route path="/admin" element={<AdminIndexRedirect />} />

            {/* Fallback for unknown routes */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
