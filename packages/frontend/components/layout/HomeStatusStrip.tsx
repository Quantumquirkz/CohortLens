"use client";

import axios from "axios";
import { motion, useReducedMotion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

import { useGraphqlHomeStatus } from "@/hooks/useGraphqlReads";
import { useModelsList } from "@/hooks/useModelsApi";
import { healthUrl } from "@/lib/api";
import { USE_GRAPHQL_READS } from "@/lib/graphql-client";

type HealthResponse = { status?: string };

async function fetchHealth(): Promise<HealthResponse> {
  const { data } = await axios.get<HealthResponse>(healthUrl(), {
    timeout: 8_000,
  });
  return data;
}

function StatusPill({
  label,
  status,
}: {
  label: string;
  status: "ok" | "warn" | "error" | "loading";
}) {
  const dot =
    status === "ok"
      ? "bg-emerald-400 shadow-[0_0_8px_hsl(142_70%_50%/0.5)]"
      : status === "warn"
        ? "bg-amber-400"
        : status === "loading"
          ? "bg-muted-foreground/60 animate-pulse"
          : "bg-red-400";

  return (
    <div className="status-pill">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

export function HomeStatusStrip() {
  const reduceMotion = useReducedMotion();
  const gqlStatus = useGraphqlHomeStatus();
  const health = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    staleTime: 30_000,
    retry: 1,
  });
  const models = useModelsList(false);

  const usingGraphql = USE_GRAPHQL_READS;

  const apiStatus: "ok" | "warn" | "error" | "loading" = usingGraphql
    ? gqlStatus.isLoading
      ? "loading"
      : gqlStatus.isError
        ? "error"
        : gqlStatus.data?.apiStatus === "ok"
          ? "ok"
          : "warn"
    : health.isLoading
    ? "loading"
    : health.isError
      ? "error"
      : health.data?.status === "ok"
        ? "ok"
        : "warn";

  const apiLabel =
    usingGraphql ?
      gqlStatus.isLoading ?
        "Checking API…"
      : gqlStatus.isError ?
        "API unreachable"
      : gqlStatus.data?.apiStatus === "ok" ?
        "API online"
      : "API unknown state"
    : health.isLoading ?
      "Checking API…"
    : health.isError ?
      "API unreachable"
    : health.data?.status === "ok" ?
      "API online"
    : "API unknown state";

  const modelsLabel =
    usingGraphql ?
      gqlStatus.isLoading ?
        "Models: …"
      : gqlStatus.isError ?
        "Models: unavailable"
      : `Models in cache: ${gqlStatus.data?.modelsCount ?? 0}`
    : models.isLoading ?
      "Models: …"
    : models.isError ?
      "Models: unavailable"
    : `Models in cache: ${models.data?.length ?? 0}`;

  const modelsDot: "ok" | "warn" | "error" | "loading" = usingGraphql
    ? gqlStatus.isLoading
      ? "loading"
      : gqlStatus.isError
        ? "error"
        : "ok"
    : models.isLoading
      ? "loading"
      : models.isError
        ? "error"
        : "ok";

  return (
    <motion.div
      className="mx-auto flex max-w-5xl flex-wrap justify-center gap-3 px-4 pb-4 pt-2"
      initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20px" }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <StatusPill label={apiLabel} status={apiStatus} />
      <StatusPill label={modelsLabel} status={modelsDot} />
    </motion.div>
  );
}
