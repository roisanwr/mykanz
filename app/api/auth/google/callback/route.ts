// app/api/auth/google/callback/route.ts
// Dipanggil Google setelah user approve/deny consent screen

import { NextRequest } from 'next/server';
import { handleCallback } from '@/lib/gmail/oauth';
import { redirect } from 'next/navigation';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const userId = searchParams.get('state');
  const error = searchParams.get('error');

  // User membatalkan / menolak consent
  if (error) {
    return redirect('/settings?gmail=denied');
  }

  if (!code || !userId) {
    return redirect('/settings?gmail=error');
  }

  try {
    await handleCallback(code, userId);
    return redirect('/settings?gmail=connected');
  } catch (err: any) {
    // NEXT_REDIRECT bukan error — itu adalah mekanisme redirect() di Next.js 13+
    // Jika tidak di-rethrow, catch ini akan menangkap redirect sukses sebagai error!
    if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err;

    console.error('[Gmail Callback] Error:', err);
    const errorMessage = err?.message || 'Unknown error';
    return redirect(`/settings?gmail=error&details=${encodeURIComponent(errorMessage)}`);
  }
}
