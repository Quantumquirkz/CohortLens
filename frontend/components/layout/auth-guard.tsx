"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";

export function AuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/login") return;
    if (!isAuthenticated()) {
      window.location.href = "/login";
    }
  }, [pathname]);

  return <>{children}</>;
}
