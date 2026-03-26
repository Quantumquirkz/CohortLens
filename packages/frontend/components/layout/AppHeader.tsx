import Link from "next/link";

import { ChainBadge } from "@/components/ui/ChainBadge";
import { WalletButton } from "@/components/ui/WalletButton";

const navLinkClass =
  "text-sm font-medium text-muted-foreground transition duration-200 hover:text-foreground";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/10 bg-background/75 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-foreground transition-opacity hover:opacity-90"
        >
          CohortLens
        </Link>
        <nav className="flex flex-1 items-center justify-center gap-6 sm:gap-8">
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
