import React from 'react';
import AdminUpload from '../../components/admin/AdminUpload';
import ProtectedRoute from '../../components/routing/ProtectedRoute';

const AdminUploadPage: React.FC = () => {
  return (
    <ProtectedRoute>
      <AdminUpload />
    </ProtectedRoute>
  );
};

console.log("▶️ Uploading to:", `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/storage`);

export default AdminUploadPage;
