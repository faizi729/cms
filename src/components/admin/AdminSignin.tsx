'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ADMIN_LOGIN_PROVIDER, NOT_STAFF_ERROR } from '@/lib/rbac';

/** Only allow returning to admin pages, never to another site. */
function safeAdminCallback(raw: string | null): string {
  if (raw && (/^\/admin(\/|$|\?)/).test(raw) && !raw.startsWith('/admin/login')) {
    return raw;
  }
  return '/admin';
}

const AdminSignin = ({ learnerEmail }: { learnerEmail: string | null }) => {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    setSubmitting(true);
    setError(null);

    const res = await signIn(ADMIN_LOGIN_PROVIDER, {
      username: email,
      password,
      redirect: false,
    });

    if (res && !res.error) {
      toast.success('Signed in to admin panel');
      // Full reload so every part of the app picks up the new admin session.
      window.location.assign(safeAdminCallback(searchParams.get('callbackUrl')));
      return;
    }

    setSubmitting(false);
    if (res?.error === NOT_STAFF_ERROR) {
      setError(
        'This account does not have admin access. Use the learner login instead.',
      );
    } else if (res?.error === 'CredentialsSignin') {
      setError('Invalid email or password.');
    } else {
      setError('Something went wrong. Please try again.');
    }
  };

  return (
    <section className="wrapper relative flex min-h-screen items-center justify-center overflow-hidden antialiased">
      <div className="flex w-full flex-col gap-10 rounded-2xl border-2 bg-primary/5 p-8 sm:max-w-[26rem]">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-gradient-to-b from-blue-400 to-blue-700 text-white">
            <ShieldCheck className="size-6" />
          </div>
          <h2 className="text-3xl font-semibold tracking-tighter">
            Admin Login
          </h2>
          <p className="text-sm text-primary/70">
            For staff only: Admins, Instructors and Moderators.
          </p>
        </div>

        {learnerEmail && (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            You are signed in as a learner ({learnerEmail}). Signing in here
            replaces that session with an admin session.
          </p>
        )}

        <form className="flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="admin-email">Email</Label>
            <Input
              id="admin-email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="name@email.com"
              className="border-none bg-primary/5"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="admin-password">Password</Label>
            <div className="relative">
              <Input
                id="admin-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                className="border-none bg-primary/5 pr-16"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 px-3 text-sm text-neutral-500"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-500">
              {error}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            variant="branding"
            disabled={submitting || !email || !password}
          >
            {submitting ? 'Signing in...' : 'Sign in as admin'}
          </Button>
        </form>

        <p className="text-center text-sm text-primary/70">
          Not staff?{' '}
          <Link href="/signin" className="underline">
            Go to learner login
          </Link>
        </p>
      </div>
    </section>
  );
};

export default AdminSignin;
