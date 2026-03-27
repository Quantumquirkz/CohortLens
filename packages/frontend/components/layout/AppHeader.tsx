import Link from "next/link";

import { ChainBadge } from "@/components/ui/ChainBadge";
import { WalletButton } from "@/components/ui/WalletButton";

const navLinkClass =
  "rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition duration-200 hover:bg-card/80 hover:text-foreground";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5">
        <Link
          href="/"
          className="shrink-0 text-lg font-semibold tracking-tight text-foreground transition-opacity hover:opacity-90"
        >
          <span className="bg-gradient-to-r from-cyan-200 to-cyan-100 bg-clip-text text-transparent">
            CohortLens
          </span>
          <span className="ml-2 rounded-full border border-cyan-300/25 bg-cyan-500/10 px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wider text-cyan-200">
            Pro
          </span>
        </Link>
        <nav className="flex flex-1 items-center justify-center gap-1 overflow-x-auto rounded-full border border-border/60 bg-card/50 p-1.5 md:gap-2">
          <Link href="/" className={navLinkClass}>
            Home
          </Link>
          <Link href="/marketplace" className={navLinkClass}>
            Marketplace
          </Link>
          <Link href="/lab" className={navLinkClass}>
            Lab
          </Link>
          <Link href="/dashboard" className={navLinkClass}>
            Dashboard
          </Link>
          <Link href="/risk" className={navLinkClass}>
            Risk
          </Link>
          <Link href="/staking" className={navLinkClass}>
            Staking
          </Link>
          <Link href="/governance" className={navLinkClass}>
            Governance
          </Link>
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <ChainBadge />
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
