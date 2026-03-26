import Link from "next/link";

import { primaryButtonClass, primarySoftButtonClass } from "@/lib/button-classes";

const gradioUrl =
  process.env.NEXT_PUBLIC_GRADIO_URL?.trim() || "http://localhost:7860";

export default function LabPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col gap-6 px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        ML Lab
      </h1>
      <p className="text-muted-foreground">
        Interactive demos run in the Gradio service (Docker profile{" "}
        <code className="rounded-md border border-border/10 bg-card px-1.5 py-0.5 font-mono text-xs text-card-foreground">
          labs
        </code>
        ). Use the link below to open the lab UI in a new tab.
      </p>
      <div className="flex flex-wrap gap-3">
        <a
          href={gradioUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={primaryButtonClass}
        >
          Open Gradio Lab
        </a>
        <Link href="/marketplace" className={primarySoftButtonClass}>
          Back to marketplace
        </Link>
      </div>
      <p className="text-sm text-muted-foreground/90">
        Configure{" "}
        <code className="rounded-md border border-border/10 bg-card px-1.5 py-0.5 font-mono text-xs text-card-foreground">
          NEXT_PUBLIC_GRADIO_URL
        </code>{" "}
        if the lab runs on a host other than the default.
      </p>
    </main>
  );
}
