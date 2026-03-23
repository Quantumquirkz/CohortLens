import type { AppProps } from "next/app";

import { AppHeader } from "@/components/layout/AppHeader";
import { Providers } from "../app/providers";

import "../styles/globals.css";

export default function PagesApp({ Component, pageProps }: AppProps) {
  return (
    <Providers>
      <div className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <AppHeader />
        <main>
          <Component {...pageProps} />
        </main>
      </div>
    </Providers>
  );
}
