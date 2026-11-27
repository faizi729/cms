import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

// No landing page: send users straight to login, or to their courses if
// they're already signed in.
export default async function Home() {
  const session = await getServerSession(authOptions);
  redirect(session?.user ? '/home' : '/signin');
}
