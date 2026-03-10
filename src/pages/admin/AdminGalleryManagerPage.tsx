import React from "react";
import AdminGalleryManager from "../../components/admin/AdminGalleryManager";
import AdminShellLayout from "../../components/admin/AdminShellLayout";
import { supabase } from "../../lib/supabase";
import { logAdminAction, logAdminError } from "../../lib/observability/logger";
import { ROUTES } from "../../config/routes";

const AdminGalleryManagerPage: React.FC = () => {
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      logAdminAction("auth.logout");
      window.location.href = ROUTES.admin.login;
    } catch (error) {
      logAdminError("auth.logout_failed", { message: String(error) });
    }
  };

  return (
    <AdminShellLayout
      title="Gallery Manager"
      subtitle="Manage top picks, seasonal picks, and image flags."
      activeNav="gallery"
      onLogout={handleLogout}
    >
      <AdminGalleryManager />
    </AdminShellLayout>
  );
};

export default AdminGalleryManagerPage;
