// Server-only: imports Prisma-backed auth options. Never import from client code.
import { getServerSession } from 'next-auth';
import { timingSafeEqual } from 'crypto';
import { authOptions, session as AppSession } from '@/lib/auth';
import { hasPermission, isRole, Permission, ROLE, Role } from '@/lib/rbac';

export type CurrentUser = AppSession['user'] & { role: Role };

/** The signed-in user with a role, or null when logged out. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = (await getServerSession(authOptions)) as AppSession | null;
  if (!session?.user?.id) return null;
  const role = isRole(session.user.role) ? session.user.role : ROLE.USER;
  return { ...session.user, role };
}

/** For server actions / pages: the current user if they hold `permission`, else null. */
export async function getUserWithPermission(
  permission: Permission,
): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, permission)) return null;
  return user;
}

function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * True when the shared ADMIN_SECRET was supplied. Kept only so existing
 * scripts / machine-to-machine callers keep working. An empty or unset
 * ADMIN_SECRET never matches.
 */
export function isValidAdminSecret(provided: unknown): boolean {
  const expected = process.env.ADMIN_SECRET;
  if (!expected || typeof provided !== 'string' || !provided) return false;
  return secretsMatch(provided, expected);
}

/**
 * For /api/admin routes: allowed when the signed-in user holds `permission`,
 * or when a valid ADMIN_SECRET is supplied by a script.
 */
export async function authorizeAdminRequest(
  permission: Permission,
  adminSecret?: unknown,
): Promise<boolean> {
  if (await getUserWithPermission(permission)) return true;
  return isValidAdminSecret(adminSecret);
}
