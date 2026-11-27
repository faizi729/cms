'use client';

import { getSession, signOut } from 'next-auth/react';
import { ADMIN_LOGIN_PATH, LOGIN_TYPE } from '@/lib/rbac';

/**
 * Sign out, sending staff back to the admin login.
 * Sessions from the admin login go to /admin/login; learner sessions use
 * `learnerCallbackUrl`, or next-auth's default (the current page) when omitted.
 */
export async function logout(learnerCallbackUrl?: string) {
  const session = await getSession();
  const loginType = (session?.user as { loginType?: string } | undefined)
    ?.loginType;

  if (loginType === LOGIN_TYPE.ADMIN) {
    await signOut({ callbackUrl: ADMIN_LOGIN_PATH });
    return;
  }

  await signOut(
    learnerCallbackUrl ? { callbackUrl: learnerCallbackUrl } : undefined,
  );
}
