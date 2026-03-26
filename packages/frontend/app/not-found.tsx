"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { primaryButtonClass, primarySoftButtonClass } from "@/lib/button-classes";

export default function NotFound() {
  return (
    <motion.div
      className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-20 text-center"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
        404
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
        Page not found
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The URL may be mistyped or the page was moved.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className={primaryButtonClass}>
          Back home
        </Link>
        <Link href="/dashboard" className={primarySoftButtonClass}>
          Dashboard
        </Link>
      </div>
    </motion.div>
  );
}
