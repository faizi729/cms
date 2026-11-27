import { redirect } from 'next/navigation';
import React from 'react';
import { getCurrentUser } from '@/lib/rbac-server';
import {
  ADMIN_LOGIN_PATH,
  hasPermission,
  LOGIN_TYPE,
  PERMISSION,
} from '@/lib/rbac';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Admin pages need a session created through the admin login, not the
  // learner login, and a role that grants admin access.
  if (
    !user ||
    user.loginType !== LOGIN_TYPE.ADMIN ||
    !hasPermission(user.role, PERMISSION.ADMIN_ACCESS)
  ) {
    return redirect(ADMIN_LOGIN_PATH);
  }

  return (
    <div className="mt-[6rem] flex h-[calc(100vh-36px-4rem)] max-h-full">
      {children}
    </div>
  );
}
