export default function PageEditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout intentionally returns children without the DashboardShell
  // to give the page editor a full-screen experience
  return <>{children}</>;
}
