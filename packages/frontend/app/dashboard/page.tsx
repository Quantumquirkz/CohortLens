"use client";

import axios from "axios";
import type { FormEvent } from "react";
import { useState } from "react";

import { toast } from "sonner";

import { CohortTable } from "@/components/cohort/CohortTable";
import { useGraphqlDashboardSummary } from "@/hooks/useGraphqlReads";
import { useCohortApi } from "@/hooks/useCohortApi";
import { primaryButtonClass, primarySoftButtonClass } from "@/lib/button-classes";
import { USE_GRAPHQL_READS } from "@/lib/graphql-client";
import type { CohortResponse } from "@/types/cohort";

function parseApiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data as { detail?: unknown } | undefined;
    const d = detail?.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) {
      return d
        .map((e: { msg?: string }) => e?.msg ?? JSON.stringify(e))
        .join("; ");
    }
    if (d != null) return JSON.stringify(d);
    return err.message || "Network error";
  }
  if (err instanceof Error) return err.message;
  return "Unknown error";
}

export default function DashboardPage() {
  const [protocol, setProtocol] = useState("");
  const [chain, setChain] = useState("polygon");
  const [startBlock, setStartBlock] = useState("");
  const [endBlock, setEndBlock] = useState("");
  const [numClusters, setNumClusters] = useState("3");

  const [clientError, setClientError] = useState<string | null>(null);
  const [result, setResult] = useState<CohortResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const discover = useCohortApi();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setClientError(null);
    setResult(null);

    const start = Number.parseInt(startBlock, 10);
    const end = Number.parseInt(endBlock, 10);
    const clusters = Number.parseInt(numClusters, 10);

    if (!protocol.trim()) {
      const msg = "Enter a protocol name.";
      setClientError(msg);
      toast.warning(msg);
      return;
    }
    if (Number.isNaN(start) || Number.isNaN(end)) {
      const msg = "Blocks must be valid integers.";
      setClientError(msg);
      toast.warning(msg);
      return;
    }
    if (start > end) {
      const msg = "Start block cannot be greater than end block.";
      setClientError(msg);
      toast.warning(msg);
      return;
    }
    if (Number.isNaN(clusters) || clusters < 1 || clusters > 200) {
      const msg = "Number of clusters must be between 1 and 200.";
      setClientError(msg);
      toast.warning(msg);
      return;
    }

    const body = {
      protocol: protocol.trim(),
      chain: chain.trim() || "polygon",
      start_block: start,
      end_block: end,
      num_clusters: clusters,
    };

    try {
      const data = await discover.mutateAsync(body);
      setResult(data);
      toast.success("Clusters ready", {
        description: `${data.cohorts.length} cohorts · ${data.total_users} users`,
      });
    } catch (err) {
      const msg = parseApiError(err);
      setClientError(msg);
      toast.error(msg);
    }
  }

  const apiError =
    discover.isError && !clientError ? parseApiError(discover.error) : null;
  const startNum = Number.parseInt(startBlock, 10);
  const endNum = Number.parseInt(endBlock, 10);
  const summary = useGraphqlDashboardSummary({
    protocol: protocol.trim(),
    chain: chain.trim() || "polygon",
    startBlock: Number.isNaN(startNum) ? -1 : startNum,
    endBlock: Number.isNaN(endNum) ? -1 : endNum,
    enabled: USE_GRAPHQL_READS,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="surface-card mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-200">
          Analytics Terminal
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          Cohort discovery
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Send parameters to the backend and review clusters (POST{" "}
          <code className="rounded-md border border-border/10 bg-card px-1.5 py-0.5 font-mono text-xs text-card-foreground">
            /api/v1/cohorts/discover
          </code>
          ).
        </p>
      </header>

      {USE_GRAPHQL_READS && summary.data && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="surface-panel">
            <p className="text-xs text-muted-foreground">Users</p>
            <p className="text-lg font-semibold text-foreground">{summary.data.totalUsers}</p>
          </div>
          <div className="surface-panel">
            <p className="text-xs text-muted-foreground">Tx count</p>
            <p className="text-lg font-semibold text-foreground">{summary.data.txCount}</p>
          </div>
          <div className="surface-panel">
            <p className="text-xs text-muted-foreground">Total volume</p>
            <p className="text-lg font-semibold text-foreground">
              {summary.data.totalVolume.toFixed(2)}
            </p>
          </div>
          <div className="surface-panel">
            <p className="text-xs text-muted-foreground">Avg gas</p>
            <p className="text-lg font-semibold text-foreground">
              {summary.data.avgGas.toFixed(0)}
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="surface-card mb-10">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground/90">
              Protocol name
            </span>
            <input
              type="text"
              value={protocol}
              onChange={(e) => setProtocol(e.target.value)}
              className="input-field"
              placeholder="e.g. aave-v3"
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground/90">Chain</span>
            <input
              type="text"
              value={chain}
              onChange={(e) => setChain(e.target.value)}
              className="input-field"
              placeholder="polygon"
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground/90">
              Start block
            </span>
            <input
              type="number"
              inputMode="numeric"
              value={startBlock}
              onChange={(e) => setStartBlock(e.target.value)}
              className="input-field"
              min={0}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground/90">
              End block
            </span>
            <input
              type="number"
              inputMode="numeric"
              value={endBlock}
              onChange={(e) => setEndBlock(e.target.value)}
              className="input-field"
              min={0}
            />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-sm font-medium text-foreground/90">
              Number of clusters
            </span>
            <input
              type="number"
              inputMode="numeric"
              value={numClusters}
              onChange={(e) => setNumClusters(e.target.value)}
              className="input-field max-w-xs"
              min={1}
              max={200}
            />
          </label>
        </div>

        {(clientError || apiError) && (
          <p className="mt-4 rounded-xl border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
            {clientError ?? apiError}
          </p>
        )}

        <div className="mt-6">
          <button
            type="submit"
            disabled={discover.isPending}
            className={primaryButtonClass}
          >
            {discover.isPending ? "Sending…" : "Discover cohorts"}
          </button>
        </div>
      </form>

      {result && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={`${primarySoftButtonClass} !px-4 !py-2 !text-xs`}
              onClick={() => {
                void navigator.clipboard
                  .writeText(JSON.stringify(result, null, 2))
                  .then(() => {
                    setCopied(true);
                    toast.success("Copied to clipboard");
                    window.setTimeout(() => setCopied(false), 2000);
                  })
                  .catch(() => toast.error("Could not copy"));
              }}
            >
              {copied ? "Copied" : "Copy JSON"}
            </button>
            <button
              type="button"
              className={`${primaryButtonClass} !px-4 !py-2 !text-xs`}
              onClick={() => {
                setResult(null);
                toast.info("Results cleared");
              }}
            >
              Clear results
            </button>
          </div>
          <CohortTable cohorts={result.cohorts} totalUsers={result.total_users} />
        </div>
      )}
    </div>
  );
}
