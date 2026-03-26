"use client";

import { primaryButtonClass } from "@/lib/button-classes";

import "@/styles/globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center text-foreground">
        <h2 className="text-xl font-semibold">Critical error</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {error.message || "Could not render the application."}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className={`${primaryButtonClass} mt-6`}
        >
          Retry
        </button>
      </body>
    </html>
  );
}
