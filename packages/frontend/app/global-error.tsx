"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center text-slate-100">
        <h2 className="text-xl font-semibold">Critical error</h2>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          {error.message || "Could not render the application."}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Retry
        </button>
      </body>
    </html>
  );
}
