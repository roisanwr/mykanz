export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      {/* Sidebar di sini */}
      <aside className="w-64">
        {/* Navigation menu */}
      </aside>
      {/* Main content */}
      <main className="flex-1">
        {/* Navbar di sini */}
        {children}
      </main>
    </div>
  );
}
