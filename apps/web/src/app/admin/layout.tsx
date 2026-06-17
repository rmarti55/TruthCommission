export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-canvas text-text">{children}</div>;
}
