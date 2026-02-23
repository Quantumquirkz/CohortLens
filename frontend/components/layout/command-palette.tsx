"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  Link2,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const actions = [
  { label: "Go to Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Go to Predict", href: "/predict", icon: Calculator },
  { label: "Go to Segment", href: "/segment", icon: Users },
  { label: "Go to Recommendations", href: "/recommendations", icon: MessageSquare },
  { label: "Go to Data Drift", href: "/drift", icon: Activity },
  { label: "Go to Reports", href: "/reports", icon: FileText },
  { label: "Go to Audit Log", href: "/audit", icon: ListChecks },
  { label: "Go to Consent", href: "/consent", icon: Shield },
  { label: "Go to Web3 / Blockchain", href: "/web3", icon: Link2 },
  { label: "Go to Usage", href: "/usage", icon: Zap },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleSelect(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Quick actions"
      description="Search for a page to navigate to"
    >
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {actions.map((action) => (
            <CommandItem
              key={action.href}
              onSelect={() => handleSelect(action.href)}
            >
              <action.icon className="mr-2 size-4" />
              {action.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
