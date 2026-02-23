"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { CommandPalette } from "@/components/layout/command-palette";
import { ErrorBoundary } from "@/components/layout/error-boundary";
import { OnboardingTour } from "@/components/layout/onboarding-tour";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-dvh flex-col">
      <Header onMenuToggle={() => setMobileOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <div className="hidden md:block">
          <Sidebar className="h-full" />
        </div>
        {/* Mobile sidebar sheet */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-60 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
              <SheetDescription>App navigation menu</SheetDescription>
            </SheetHeader>
            <Sidebar className="border-r-0" />
          </SheetContent>
        </Sheet>
        <main
          id="main-content"
          className="flex-1 overflow-y-auto bg-background"
        >
          <div className="mx-auto max-w-7xl p-6">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
      </div>
      <CommandPalette />
      <OnboardingTour />
    </div>
  );
}
