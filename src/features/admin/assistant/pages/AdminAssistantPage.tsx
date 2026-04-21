import React from "react";

import AdminAssistant from "../components/AdminAssistant";
import AdminShellLayout from "../../shared/components/AdminShellLayout";
import { supabase } from "../../../../lib/supabase";
import { logAdminAction, logAdminError } from "../../../../lib/observability/logger";
import { ROUTES } from "../../../../config/routes";

const AdminAssistantPage: React.FC = () => {
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
      title="Assistant"
      subtitle="General internal advisory help for pricing, wording, planning, and creative direction."
      activeNav="assistant"
      onLogout={handleLogout}
    >
      <AdminAssistant />
    </AdminShellLayout>
  );
};

export default AdminAssistantPage;
