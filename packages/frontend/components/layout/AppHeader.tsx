import Link from "next/link";

import { WalletButton } from "@/components/ui/WalletButton";

const navLinkClass =
  "text-sm font-medium text-slate-300 transition hover:text-white";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight text-white">
          CohortLens
        </Link>
        <nav className="flex flex-1 items-center justify-center gap-6 sm:gap-8">
          <Link href="/" className={navLinkClass}>
            Home
          </Link>
          <Link href="/marketplace" className={navLinkClass}>
            Marketplace
          </Link>
          <Link href="/dashboard" className={navLinkClass}>
            Dashboard
          </Link>
        </nav>
        <div className="shrink-0">
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
