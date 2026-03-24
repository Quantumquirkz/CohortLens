import Link from "next/link";

const gradioUrl =
  process.env.NEXT_PUBLIC_GRADIO_URL?.trim() || "http://localhost:7860";

export default function LabPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col gap-6 px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">ML Lab</h1>
      <p className="text-neutral-600 dark:text-neutral-400">
        Interactive demos run in the Gradio service (Docker profile{" "}
        <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">labs</code>
        ). Use the link below to open the lab UI in a new tab.
      </p>
      <div className="flex flex-wrap gap-3">
        <a
          href={gradioUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
        >
          Open Gradio Lab
        </a>
        <Link
          href="/marketplace"
          className="inline-flex rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-900"
        >
          Back to marketplace
        </Link>
      </div>
      <p className="text-sm text-neutral-500">
        Configure <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">NEXT_PUBLIC_GRADIO_URL</code>{" "}
        if the lab runs on a host other than the default.
      </p>
    </main>
  );
}
