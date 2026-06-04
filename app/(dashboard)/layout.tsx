import { auth } from '@/lib/auth';
import DashboardLayout from '@/components/DashboardLayout';
import { redirect } from 'next/navigation';

export default async function DashboardRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <DashboardLayout user={session.user}>
      {children}
    </DashboardLayout>
  );
}