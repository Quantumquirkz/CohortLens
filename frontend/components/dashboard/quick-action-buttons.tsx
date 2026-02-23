"use client";

import Link from "next/link";
import { Calculator, Users, MessageSquare, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

const quickActions = [
  { label: "New prediction", href: "/predict", icon: Calculator },
  { label: "Segment customers", href: "/segment", icon: Users },
  { label: "Ask AI", href: "/recommendations", icon: MessageSquare },
  { label: "Generate report", href: "/reports", icon: FileText },
];

export function QuickActionButtons() {
  return (
    <div className="flex flex-wrap gap-3">
      {quickActions.map((action) => (
        <Button key={action.href} variant="outline" size="sm" className="rounded-lg" asChild>
          <Link href={action.href}>
            <action.icon className="mr-2 size-4" />
            {action.label}
          </Link>
        </Button>
      ))}
    </div>
  );
}
