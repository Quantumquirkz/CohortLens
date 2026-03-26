"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

const items = [
  {
    href: "/dashboard",
    title: "Cohort discovery",
    body: "Cluster on-chain activity by protocol and block range.",
  },
  {
    href: "/marketplace",
    title: "Model marketplace",
    body: "Browse registered ML lenses and run inference.",
  },
  {
    href: "/lab",
    title: "ML lab",
    body: "Open Gradio demos when the stack profile is enabled.",
  },
  {
    href: "/staking",
    title: "Staking",
    body: "Lock LENS in the staking contract from your wallet.",
  },
  {
    href: "/governance",
    title: "Governance",
    body: "Review proposals and cast votes with delegated power.",
  },
] as const;

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
};

const cardVariants = (reduceMotion: boolean) => ({
  hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 },
  visible: reduceMotion
    ? { opacity: 1, transition: { duration: 0.2 } }
    : {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
      },
});

export function HomeFeatures() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="mx-auto max-w-5xl px-4 pb-24 pt-6">
      <motion.h2
        className="mb-10 text-center text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground"
        initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.35 }}
      >
        Explore platform modules
      </motion.h2>
      <motion.div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-30px" }}
        variants={containerVariants}
      >
        {items.map((item) => (
          <motion.div key={item.href} variants={cardVariants(!!reduceMotion)}>
            <Link href={item.href} className="feature-card group h-full">
              <span className="flex items-start justify-between gap-2">
                <span className="text-base font-semibold text-foreground">
                  {item.title}
                </span>
                <span
                  className="text-muted-foreground transition group-hover:text-accent"
                  aria-hidden
                >
                  →
                </span>
              </span>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.body}
              </p>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
