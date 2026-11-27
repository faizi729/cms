import db from '@/db';
import CredentialsProvider from 'next-auth/providers/credentials';
import { JWTPayload, SignJWT, importJWK } from 'jose';
import bcrypt from 'bcrypt';
import prisma from '@/db';
import { NextAuthOptions } from 'next-auth';
import { Session } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import { randomUUID } from 'crypto';
import {
  hasPermission,
  isRole,
  ADMIN_LOGIN_PROVIDER,
  LOGIN_TYPE,
  LoginType,
  NOT_STAFF_ERROR,
  PERMISSION,
  resolveRole,
  ROLE,
  USER_LOGIN_PROVIDER,
  Role,
} from '@/lib/rbac';

interface AppxSigninResponse {
  data: {
    userid: string;
    name: string;
    username?: string;
    token: string;
  } | null;
}

export interface session extends Session {
  user: {
    id: string;
    jwtToken: string;
    role: Role;
    /** Which login page created this session. Only 'admin' sessions get staff roles. */
    loginType: LoginType;
    email: string;
    name: string;
  };
}

interface token extends JWT {
  uid: string;
  jwtToken: string;
  role?: Role;
  loginType?: LoginType;
}

interface user {
  id: string;
  name: string | null;
  email: string;
  token: string;
}

const generateJWT = async (payload: JWTPayload) => {
  const secret = process.env.JWT_SECRET || 'secret';

  const jwk = await importJWK({ k: secret, alg: 'HS256', kty: 'oct' });

  const jwt = await new SignJWT({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    jti: randomUUID(), // Adding a unique jti to ensure each token is unique. This helps generate a unique jwtToken on every login
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('365d')
    .sign(jwk);

  return jwt;
};
async function validateUser(
  email: string,
  password: string,
): Promise<
  | { data: null }
  | {
    data: {
      name: string;
      userid: string;
      token: string;
    };
  }
> {
  if (process.env.LOCAL_CMS_PROVIDER) {
    if (password === '123456') {
      return {
        data: {
          name: 'Random',
          userid: '1',
          token: '',
        },
      };
    }
    return { data: null };
  }
  const url = `${process.env.APPX_BASE_API}/post/userLogin`;
  const headers = {
    'Client-Service': process.env.APPX_CLIENT_SERVICE || '',
    'Auth-Key': process.env.APPX_AUTH_KEY || '',
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  const body = new URLSearchParams();
  body.append('email', email);
  body.append('password', password);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data as any; // Or process data as needed
  } catch (error) {
    console.error('Error validating user:', error);
  }
  return {
    data: null,
  };
}

/** Checks email + password (local DB first, then Appx). Shared by both logins. */
async function authorizeCredentials(credentials: any): Promise<user | null> {
  try {
    if (process.env.LOCAL_CMS_PROVIDER) {
      return {
        id: '1',
        name: 'test',
        email: 'test@gmail.com',
        token: await generateJWT({
          id: '1',
        }),
      };
    }
    const hashedPassword = await bcrypt.hash(credentials.password, 10);

    const userDb = await prisma.user.findFirst({
      where: {
        email: credentials.username,
      },
      select: {
        password: true,
        id: true,
        name: true,
        appxAuthToken: true,
      },
    });
    if (
      userDb &&
      userDb.password &&
      (await bcrypt.compare(credentials.password, userDb.password)) &&
      userDb?.appxAuthToken
    ) {
      const jwt = await generateJWT({
        id: userDb.id,
      });
      await db.user.update({
        where: {
          id: userDb.id,
        },
        data: {
          token: jwt,
        },
      });

      return {
        id: userDb.id,
        name: userDb.name,
        email: credentials.username,
        token: jwt,
      };
    }
    console.log('not in db');
    const user: AppxSigninResponse = await validateUser(
      credentials.username,
      credentials.password,
    );

    const jwt = await generateJWT({
      id: user.data?.userid,
    });

    if (user.data) {
      try {
        await db.user.upsert({
          where: {
            id: user.data.userid,
          },
          create: {
            id: user.data.userid,
            name: user.data.name,
            email: credentials.username,
            token: jwt,
            password: hashedPassword,
            appxAuthToken: user.data.token,
          },
          update: {
            id: user.data.userid,
            name: user.data.name,
            email: credentials.username,
            token: jwt,
            password: hashedPassword,
            appxAuthToken: user.data.token,
          },
        });
      } catch (e) {
        console.log(e);
      }

      return {
        id: user.data.userid,
        name: user.data.name,
        email: credentials.username,
        token: jwt,
      };
    }

    // Return null if user data could not be retrieved
    return null;
  } catch (e) {
    console.error(e);
  }
  return null;
}

const credentialFields = {
  username: { label: 'email', type: 'text', placeholder: '' },
  password: { label: 'password', type: 'password', placeholder: '' },
};

export const authOptions = {
  providers: [
    // Learner login (/signin). Always produces a USER session, even for staff.
    CredentialsProvider({
      id: USER_LOGIN_PROVIDER,
      name: 'Credentials',
      credentials: credentialFields,
      async authorize(credentials: any) {
        const authed = await authorizeCredentials(credentials);
        if (!authed) return null;
        return { ...authed, loginType: LOGIN_TYPE.USER };
      },
    }),
    // Staff login (/admin/login). Only accounts whose role grants admin access.
    CredentialsProvider({
      id: ADMIN_LOGIN_PROVIDER,
      name: 'Admin Credentials',
      credentials: credentialFields,
      async authorize(credentials: any) {
        const authed = await authorizeCredentials(credentials);
        if (!authed) return null;

        const dbUser = await prisma.user.findUnique({
          where: { id: authed.id },
          select: { role: true },
        });
        const role = resolveRole(authed.email, dbUser?.role);
        if (!hasPermission(role, PERMISSION.ADMIN_ACCESS)) {
          throw new Error(NOT_STAFF_ERROR);
        }
        return { ...authed, loginType: LOGIN_TYPE.ADMIN };
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET || 'secr3t',
  callbacks: {
    session: async ({ session, token }) => {
      const newSession: session = session as session;
      if (newSession.user && token.uid) {
        newSession.user.id = token.uid as string;
        newSession.user.jwtToken = token.jwtToken as string;
        newSession.user.role = isRole(token.role) ? token.role : ROLE.USER;
        newSession.user.loginType =
          token.loginType === LOGIN_TYPE.ADMIN
            ? LOGIN_TYPE.ADMIN
            : LOGIN_TYPE.USER;
      }
      return newSession!;
    },
    jwt: async ({ token, user }): Promise<JWT> => {
      const newToken: token = token as token;

      if (user) {
        newToken.uid = user.id;
        newToken.jwtToken = (user as user).token;
        newToken.loginType =
          (user as user & { loginType?: LoginType }).loginType ===
          LOGIN_TYPE.ADMIN
            ? LOGIN_TYPE.ADMIN
            : LOGIN_TYPE.USER;
      }

      // Staff roles only apply to sessions created through the admin login.
      // A learner-login session is always a plain USER, even for staff.
      if (newToken.loginType !== LOGIN_TYPE.ADMIN) {
        newToken.role = ROLE.USER;
      } else if (newToken.uid) {
        // Re-read the role on every session check so role changes made by an
        // admin take effect without the user having to sign out and back in.
        let dbRole: string | null = null;
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: newToken.uid },
            select: { role: true },
          });
          dbRole = dbUser?.role ?? null;
        } catch (e) {
          console.error('Failed to load user role', e);
        }
        newToken.role = resolveRole(newToken.email, dbRole);
      }
      return newToken;
    },
  },
  pages: {
    signIn: '/signin',
  },
} satisfies NextAuthOptions;
