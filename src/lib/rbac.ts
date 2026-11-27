/**
 * Role-based access control: the single source of truth for who may do what.
 *
 * This file must stay free of server-only imports (Prisma, next-auth server
 * helpers) because it is used by the edge middleware and by client components.
 * Server-side enforcement helpers live in `rbac-server.ts`.
 *
 * The role values mirror the `Role` enum in prisma/schema.prisma.
 */

export const ROLE = {
  USER: 'USER',
  MODERATOR: 'MODERATOR',
  INSTRUCTOR: 'INSTRUCTOR',
  ADMIN: 'ADMIN',
} as const;

export type Role = (typeof ROLE)[keyof typeof ROLE];

export const ALL_ROLES: Role[] = [
  ROLE.USER,
  ROLE.MODERATOR,
  ROLE.INSTRUCTOR,
  ROLE.ADMIN,
];

export const ROLE_LABELS: Record<Role, string> = {
  USER: 'User',
  MODERATOR: 'Moderator',
  INSTRUCTOR: 'Instructor',
  ADMIN: 'Admin',
};

export const PERMISSION = {
  /** Open the /admin dashboard at all. */
  ADMIN_ACCESS: 'admin:access',
  /** Approve, pin and delete any comment; delete any question or answer. */
  COMMENT_MODERATE: 'comment:moderate',
  /** Create courses, add and edit content, video metadata and segments. */
  CONTENT_MANAGE: 'content:manage',
  /** Create, edit and delete calendar events. */
  EVENT_MANAGE: 'event:manage',
  /** Log users out, change DRM / Discord flags for a user. */
  USER_MANAGE: 'user:manage',
  /** Change another user's role. */
  ROLE_MANAGE: 'role:manage',
  /** Review, confirm and delete bounty submissions. */
  BOUNTY_MANAGE: 'bounty:manage',
} as const;

export type Permission = (typeof PERMISSION)[keyof typeof PERMISSION];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  USER: [],
  MODERATOR: [PERMISSION.ADMIN_ACCESS, PERMISSION.COMMENT_MODERATE],
  INSTRUCTOR: [
    PERMISSION.ADMIN_ACCESS,
    PERMISSION.COMMENT_MODERATE,
    PERMISSION.CONTENT_MANAGE,
    PERMISSION.EVENT_MANAGE,
  ],
  ADMIN: Object.values(PERMISSION),
};

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ALL_ROLES as string[]).includes(value);
}

export function hasPermission(
  role: string | null | undefined,
  permission: Permission,
): boolean {
  if (!isRole(role)) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * Which permission each /admin section needs. The longest matching prefix
 * wins, so `/admin` itself only needs ADMIN_ACCESS.
 */
export const ADMIN_ROUTE_PERMISSIONS: { prefix: string; permission: Permission }[] =
  [
    { prefix: '/admin/add-course', permission: PERMISSION.CONTENT_MANAGE },
    { prefix: '/admin/content', permission: PERMISSION.CONTENT_MANAGE },
    { prefix: '/admin/comment', permission: PERMISSION.COMMENT_MODERATE },
    { prefix: '/admin/discord', permission: PERMISSION.USER_MANAGE },
    { prefix: '/admin/user', permission: PERMISSION.USER_MANAGE },
    { prefix: '/admin/userflags', permission: PERMISSION.USER_MANAGE },
    { prefix: '/admin/bounty', permission: PERMISSION.BOUNTY_MANAGE },
    { prefix: '/admin', permission: PERMISSION.ADMIN_ACCESS },
  ];

export function isAdminLoginPath(pathname: string): boolean {
  return pathname === ADMIN_LOGIN_PATH || pathname.startsWith(`${ADMIN_LOGIN_PATH}/`);
}

/** The permission an /admin path needs; null for non-admin paths and the admin login. */
export function permissionForAdminPath(pathname: string): Permission | null {
  if (isAdminLoginPath(pathname)) return null;
  const match = ADMIN_ROUTE_PERMISSIONS.filter(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  ).sort((a, b) => b.prefix.length - a.prefix.length)[0];
  return match ? match.permission : null;
}

/**
 * Work out a user's effective role from the database value. Server-side only
 * (reads env vars that are not exposed to the browser).
 * - LOCAL_CMS_PROVIDER (local dev only) signs everyone in as an admin, as before.
 * - Emails listed in ADMINS are always admins (break-glass, cannot be locked out).
 * - Otherwise the role stored on the user row wins.
 */
export function resolveRole(
  email: string | null | undefined,
  dbRole: string | null | undefined,
): Role {
  if (process.env.LOCAL_CMS_PROVIDER) return ROLE.ADMIN;
  if (isBootstrapAdmin(email)) return ROLE.ADMIN;
  return isRole(dbRole) ? dbRole : ROLE.USER;
}

/** Emails in the ADMINS env var are always admins, so nobody gets locked out. */
export function isBootstrapAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return (process.env.ADMINS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.trim().toLowerCase());
}

/** Which login page created a session. Only ADMIN sessions get staff roles. */
export const LOGIN_TYPE = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

export type LoginType = (typeof LOGIN_TYPE)[keyof typeof LOGIN_TYPE];

/** next-auth provider ids for the two login pages. */
export const USER_LOGIN_PROVIDER = 'credentials';
export const ADMIN_LOGIN_PROVIDER = 'admin-credentials';

/** Error code the admin login returns when the account is not staff. */
export const NOT_STAFF_ERROR = 'NotStaff';

export const ADMIN_LOGIN_PATH = '/admin/login';
