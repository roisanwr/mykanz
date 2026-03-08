// app/(dashboard)/layout.tsx
export default function DashboardRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Hanya me-return children karena Layout Utama sudah di-handle di app/layout.tsx
  return <>{children}</>;
}