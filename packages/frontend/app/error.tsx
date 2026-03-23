"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[CohortLens route error]", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-20 text-center">
      <h2 className="text-xl font-semibold text-white">Something went wrong</h2>
      <p className="text-sm text-slate-400">
        {error.message || "Unexpected error loading this section."}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
      >
        Retry
      </button>
    </div>
  );
}
