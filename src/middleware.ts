import { NextRequestWithAuth } from 'next-auth/middleware';
import { NextResponse, NextRequest } from 'next/server';
import { jwtVerify, importJWK, JWTPayload } from 'jose';
import { getToken } from 'next-auth/jwt';

import {
  ADMIN_LOGIN_PATH,
  hasPermission,
  isAdminLoginPath,
  LOGIN_TYPE,
  PERMISSION,
  permissionForAdminPath,
} from '@/lib/rbac';

export const config = {
  matcher: [
    '/courses/:path*',
    '/api/mobile/:path*',
    '/home',
    '/bounty',
    '/admin',
    '/admin/:path*',
  ],
};

// The only mobile route reachable without a user JWT. It validates its own
// Auth-Key against EXTERNAL_LOGIN_AUTH_SECRET.
const MOBILE_PUBLIC_PATHS = ['/api/mobile/signin'];

interface RequestWithUser extends NextRequest {
  user?: {
    id: string;
    email: string;
  };
}

export const verifyJWT = async (token: string): Promise<JWTPayload | null> => {
  const secret = process.env.JWT_SECRET || '';

  try {
    const jwk = await importJWK({ k: secret, alg: 'HS256', kty: 'oct' });
    const { payload } = await jwtVerify(token, jwk);

    return payload;
  } catch (error) {
    console.error('Invalid token:', error);
    return null;
  }
};

export const withMobileAuth = async (req: RequestWithUser) => {
  // Previously ANY request carrying an Auth-Key header (with any value) skipped
  // auth for every /api/mobile route. Only the sign-in route may skip the JWT.
  if (MOBILE_PUBLIC_PATHS.includes(req.nextUrl.pathname.replace(/\/$/, ''))) {
    return NextResponse.next();
  }
  const token = req.headers.get('Authorization');

  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
  }
  const payload = await verifyJWT(token);
  if (!payload) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
  }
  const newHeaders = new Headers(req.headers);

  /**
   * Add a global object 'g'
   * it holds the request claims and other keys
   * easily pass around this key as request context
   */
  newHeaders.set('g', JSON.stringify(payload));
  return NextResponse.next({
    request: {
      headers: newHeaders,
    },
  });
};

const withAuth = async (req: NextRequestWithAuth) => {
  const { pathname, search } = req.nextUrl;

  // The admin login page is public; it handles already-signed-in staff itself.
  if (isAdminLoginPath(pathname)) return;

  const token = await getToken({ req });

  // null for non-admin paths, otherwise the permission the section needs.
  const requiredPermission = permissionForAdminPath(pathname);
  const redirectToLogin = (loginPath: string) => {
    const signinUrl = new URL(loginPath, req.url);
    signinUrl.searchParams.set('callbackUrl', pathname + search);
    return NextResponse.redirect(signinUrl);
  };

  // Logged-out users must never see courses (or other protected pages),
  // even when running against the local CMS provider. Admin pages send them
  // to the admin login, everything else to the learner login.
  if (!token) {
    return redirectToLogin(requiredPermission ? ADMIN_LOGIN_PATH : '/signin');
  }

  // Admin pages need a session from the admin login (a learner-login session
  // is never staff) and a role that allows this section. Pages and APIs
  // re-check on the server with a fresh role from the database.
  if (requiredPermission) {
    const isStaffSession =
      token.loginType === LOGIN_TYPE.ADMIN &&
      hasPermission(token.role as string, PERMISSION.ADMIN_ACCESS);
    if (!isStaffSession) {
      return redirectToLogin(ADMIN_LOGIN_PATH);
    }
    if (!hasPermission(token.role as string, requiredPermission)) {
      return NextResponse.rewrite(new URL('/404', req.url));
    }
  }

  // The local provider has no external user service to validate against.
  if (process.env.LOCAL_CMS_PROVIDER) return;

  const user = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL_LOCAL}/api/user?token=${token.jwtToken}`,
  );

  const json = await user.json();
  if (!json.user) {
    return NextResponse.redirect(new URL('/invalidsession', req.url));
  }
};

export async function middleware(req: NextRequestWithAuth) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/api/mobile')) {
    return withMobileAuth(req);
  }
  return await withAuth(req);
}

export default withAuth;
