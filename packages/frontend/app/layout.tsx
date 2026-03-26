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
    "Discover on-chain user cohorts with clustering and analysis.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>
          <div className="relative min-h-screen bg-radial-glow bg-no-repeat">
            <AppHeader />
            <main className="relative">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
