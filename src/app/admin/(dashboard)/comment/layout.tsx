import React from 'react';
import RequirePermission from '@/components/admin/RequirePermission';
import { PERMISSION } from '@/lib/rbac';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RequirePermission permission={PERMISSION.COMMENT_MODERATE}>{children}</RequirePermission>
  );
}
