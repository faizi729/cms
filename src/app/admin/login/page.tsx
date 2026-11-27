import { redirect } from 'next/navigation';
import React from 'react';
import AdminSignin from '@/components/admin/AdminSignin';
import { getCurrentUser } from '@/lib/rbac-server';
import { hasPermission, LOGIN_TYPE, PERMISSION } from '@/lib/rbac';

const AdminLoginPage = async () => {
  const user = await getCurrentUser();

  // Already signed in as staff: go straight to the dashboard.
  if (
    user &&
    user.loginType === LOGIN_TYPE.ADMIN &&
    hasPermission(user.role, PERMISSION.ADMIN_ACCESS)
  ) {
    redirect('/admin');
  }

  return <AdminSignin learnerEmail={user ? user.email : null} />;
};

export default AdminLoginPage;
