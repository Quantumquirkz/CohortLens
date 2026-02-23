/**
 * Root layout – Next.js 14+ App Router.
 * Frontend is implemented separately; this file keeps the structure.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
