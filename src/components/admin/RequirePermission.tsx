import { notFound } from 'next/navigation';
import React from 'react';
import { Permission } from '@/lib/rbac';
import { getUserWithPermission } from '@/lib/rbac-server';

/**
 * Server component guard for an admin section. Renders a 404 unless the
 * signed-in user's current role grants `permission`.
 */
export default async function RequirePermission({
  permission,
  children,
}: {
  permission: Permission;
  children: React.ReactNode;
}) {
  if (!(await getUserWithPermission(permission))) {
    return notFound();
  }
  return <>{children}</>;
}
