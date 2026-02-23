"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calculator,
  Users,
  MessageSquare,
  Activity,
  FileText,
  ListChecks,
  Shield,
  Zap,
  HelpCircle,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Predict spending", href: "/predict", icon: Calculator },
  { label: "Segment customers", href: "/segment", icon: Users },
  { label: "AI recommendations", href: "/recommendations", icon: MessageSquare },
  { label: "Data drift", href: "/drift", icon: Activity },
  { label: "Reports", href: "/reports", icon: FileText },
  { label: "Audit log", href: "/audit", icon: ListChecks },
  { label: "Consent", href: "/consent", icon: Shield },
  { label: "Web3 / Blockchain", href: "/web3", icon: Link2 },
  { label: "Usage", href: "/usage", icon: Zap },
];

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <aside
      className={cn(
        "flex h-full w-60 flex-col border-r border-border bg-sidebar",
        className
      )}
    >
      <nav className="flex-1 px-3 py-4" aria-label="Main navigation">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "border-l-2 border-primary bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="size-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-border px-3 py-3">
        <button
          onClick={() => setHelpOpen(true)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <HelpCircle className="size-4 shrink-0" />
          Help
        </button>
      </div>
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Help</DialogTitle>
            <DialogDescription>Quick tips to get started with CohortLens.</DialogDescription>
          </DialogHeader>
          <ul className="list-disc pl-5 text-sm text-foreground leading-relaxed">
            <li className="py-1">
              <strong>Predict:</strong> Enter customer features (age, income, etc.) to get a spending score.
            </li>
            <li className="py-1">
              <strong>Segment:</strong> Paste a JSON array of customers to get cluster labels.
            </li>
            <li className="py-1">
              <strong>Reports:</strong> Choose metrics and figures to generate an executive report.
            </li>
            <li className="py-1">
              <strong>Web3:</strong> Consent (SSI/DID), IPFS storage, token rewards for decentralized analytics.
            </li>
          </ul>
          <p className="text-xs text-muted-foreground">
            Keyboard shortcut: Ctrl+K for quick actions.
          </p>
          <Button variant="secondary" onClick={() => setHelpOpen(false)}>
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </aside>
  );
}

export { navItems };
