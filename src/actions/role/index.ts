'use server';

import db from '@/db';
import { revalidatePath } from 'next/cache';
import { isBootstrapAdmin, isRole, PERMISSION, Role, ROLE } from '@/lib/rbac';
import { getUserWithPermission } from '@/lib/rbac-server';

export type StaffMember = {
  id: string;
  name: string | null;
  email: string | null;
  role: Role;
  /** Listed in the ADMINS env var: always an admin, cannot be changed here. */
  locked: boolean;
};

type Result<T> = { data: T; error?: never } | { data?: never; error: string };

const UNAUTHORIZED = 'Unauthorized: you need the Admin role to manage roles.';

/** Everyone whose stored role is above USER. */
export async function listStaff(): Promise<Result<StaffMember[]>> {
  if (!(await getUserWithPermission(PERMISSION.ROLE_MANAGE))) {
    return { error: UNAUTHORIZED };
  }

  const users = await db.user.findMany({
    where: { role: { not: ROLE.USER } },
    select: { id: true, name: true, email: true, role: true },
    orderBy: [{ role: 'desc' }, { email: 'asc' }],
  });

  return {
    data: users.map((u) => ({
      ...u,
      locked: isBootstrapAdmin(u.email),
    })),
  };
}

export async function setUserRole(
  email: string,
  role: string,
): Promise<Result<StaffMember>> {
  const actor = await getUserWithPermission(PERMISSION.ROLE_MANAGE);
  if (!actor) {
    return { error: UNAUTHORIZED };
  }

  if (!isRole(role)) {
    return { error: 'Invalid role.' };
  }

  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    return { error: 'Email is required.' };
  }

  const user = await db.user.findFirst({
    where: { email: { equals: trimmedEmail, mode: 'insensitive' } },
    select: { id: true, email: true },
  });
  if (!user) {
    return {
      error: 'User not found. They need to sign in at least once first.',
    };
  }

  if (user.id === actor.id && role !== ROLE.ADMIN) {
    return { error: 'You cannot remove your own Admin role.' };
  }

  if (isBootstrapAdmin(user.email) && role !== ROLE.ADMIN) {
    return {
      error:
        'This user is listed in the ADMINS env var and is always an admin. Remove them from ADMINS first.',
    };
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data: { role },
    select: { id: true, name: true, email: true, role: true },
  });

  revalidatePath('/admin/user');
  return { data: { ...updated, locked: isBootstrapAdmin(updated.email) } };
}
