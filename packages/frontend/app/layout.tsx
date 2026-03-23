import type { Metadata } from "next";

import { AppHeader } from "@/components/layout/AppHeader";

import { Providers } from "./providers";

import "@/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "CohortLens",
    template: "%s · CohortLens",
  },
  description:
    "Descubre cohortes de usuarios on-chain con clustering y análisis.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <Providers>
          <AppHeader />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
