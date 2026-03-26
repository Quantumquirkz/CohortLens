import type { AppProps } from "next/app";

import { AppHeader } from "@/components/layout/AppHeader";
import { Providers } from "../app/providers";

import "../styles/globals.css";

export default function PagesApp({ Component, pageProps }: AppProps) {
  return (
    <Providers>
      <div className="relative min-h-screen bg-background text-foreground antialiased">
        <div className="relative min-h-screen bg-radial-glow bg-no-repeat">
          <AppHeader />
          <main>
            <Component {...pageProps} />
          </main>
        </div>
      </div>
    </Providers>
  );
}
