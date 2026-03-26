"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

const stagger = {
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.06 },
  },
};

const item = (reduceMotion: boolean) => ({
  hidden: reduceMotion
    ? { opacity: 0 }
    : { opacity: 0, y: 16 },
  visible: reduceMotion
    ? { opacity: 1, transition: { duration: 0.2 } }
    : {
        opacity: 1,
        y: 0,
        transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
      },
});

export function HomeHero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden px-4 py-20 sm:py-24">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-radial-glow"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[min(520px,80vw)] w-[min(760px,95vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-cyan-500/25 via-cyan-300/15 to-transparent opacity-95 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-[-180px] right-[-120px] -z-10 h-[320px] w-[320px] rounded-full bg-gradient-to-tr from-cyan-400/15 via-blue-500/10 to-transparent blur-3xl"
        aria-hidden
      />
      <motion.div
        className="mx-auto flex max-w-4xl flex-col items-center gap-8 text-center"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        <motion.p
          className="rounded-full border border-cyan-300/30 bg-cyan-500/10 px-4 py-1 text-xs font-medium uppercase tracking-[0.2em] text-cyan-200"
          variants={item(!!reduceMotion)}
        >
          On-chain analytics terminal
        </motion.p>
        <motion.h1
          className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl md:text-6xl"
          variants={item(!!reduceMotion)}
        >
          Discover alpha-grade cohorts across on-chain markets.
        </motion.h1>
        <motion.p
          className="max-w-2xl text-pretty text-lg text-muted-foreground"
          variants={item(!!reduceMotion)}
        >
          CohortLens turns on-chain behavior into actionable segments with a
          trading-inspired UI. Connect wallet, inspect models, and run discovery
          flows from one streamlined interface.
        </motion.p>
        <motion.div
          className="flex flex-col gap-3 sm:flex-row"
          variants={item(!!reduceMotion)}
        >
          <motion.div
            whileHover={reduceMotion ? undefined : { scale: 1.02 }}
            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
          >
            <Link href="/dashboard" className="btn-primary min-w-[11rem]">
              Go to dashboard
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
