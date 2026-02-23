"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const TOUR_KEY = "cohortlens_tour_done";

export function OnboardingTour() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(TOUR_KEY);
    if (!done) {
      setOpen(true);
    }
  }, []);

  function handleDismiss() {
    localStorage.setItem(TOUR_KEY, "true");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Welcome to CohortLens</DialogTitle>
          <DialogDescription>
            Your CRM analytics platform for smarter customer insights.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-foreground leading-relaxed">
          You can predict spending, segment customers, and generate reports.
          Use the sidebar to navigate between features, or press{" "}
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-mono">
            Ctrl+K
          </kbd>{" "}
          for quick actions.
        </p>
        <Button onClick={handleDismiss}>Got it</Button>
      </DialogContent>
    </Dialog>
  );
}
