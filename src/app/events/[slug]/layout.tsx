/**
 * Layout for all public event pages.
 * Forces light-mode CSS variable overrides so event pages always render in
 * light mode regardless of the user's system / app theme setting.
 */
export default function EventPublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="light-mode min-h-screen">{children}</div>;
}
