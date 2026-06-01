// app/api/auth/google/route.ts
// Redirect user ke Google Consent Screen untuk connect Gmail

import { auth } from '@/lib/auth';
import { getAuthUrl } from '@/lib/gmail/oauth';
import { redirect } from 'next/navigation';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return redirect('/login');
  }

  const authUrl = getAuthUrl(session.user.id);
  return redirect(authUrl);
}
