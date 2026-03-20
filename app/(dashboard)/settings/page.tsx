// app/(dashboard)/settings/page.tsx
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import SettingsPage from '@/components/SettingsPage';

export const metadata = {
  title: 'Pengaturan — MyKanz',
  description: 'Kelola profil, keamanan, dan data akun MyKanz kamu.',
};

export default async function Settings() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const user = await prisma.users.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, created_at: true },
  });

  if (!user) redirect('/login');

  return (
    <SettingsPage
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at?.toISOString() ?? null,
      }}
    />
  );
}
