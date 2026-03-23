"use client";

import axios from "axios";
import type { FormEvent } from "react";
import { useState } from "react";

import { CohortTable } from "@/components/cohort/CohortTable";
import { useCohortApi } from "@/hooks/useCohortApi";
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

  const discover = useCohortApi();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setClientError(null);
    setResult(null);

    const start = Number.parseInt(startBlock, 10);
    const end = Number.parseInt(endBlock, 10);
    const clusters = Number.parseInt(numClusters, 10);

    if (!protocol.trim()) {
      setClientError("Enter a protocol name.");
      return;
    }
    if (Number.isNaN(start) || Number.isNaN(end)) {
      setClientError("Blocks must be valid integers.");
      return;
    }
    if (start > end) {
      setClientError("Start block cannot be greater than end block.");
      return;
    }
    if (Number.isNaN(clusters) || clusters < 1 || clusters > 200) {
      setClientError("Number of clusters must be between 1 and 200.");
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
    } catch (err) {
      setClientError(parseApiError(err));
    }
  }

  const apiError =
    discover.isError && !clientError ? parseApiError(discover.error) : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Cohort discovery
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Send parameters to the backend and review clusters (POST{" "}
          <code className="rounded bg-slate-800 px-1 py-0.5 text-xs">
            /api/v1/cohorts/discover
          </code>
          ).
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="mb-10 rounded-xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-300">
              Protocol name
            </span>
            <input
              type="text"
              value={protocol}
              onChange={(e) => setProtocol(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="e.g. aave-v3"
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-300">Chain</span>
            <input
              type="text"
              value={chain}
              onChange={(e) => setChain(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="polygon"
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-300">
                Start block
            </span>
            <input
              type="number"
              inputMode="numeric"
              value={startBlock}
              onChange={(e) => setStartBlock(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              min={0}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-300">
                End block
            </span>
            <input
              type="number"
              inputMode="numeric"
              value={endBlock}
              onChange={(e) => setEndBlock(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              min={0}
            />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-sm font-medium text-slate-300">
              Number of clusters
            </span>
            <input
              type="number"
              inputMode="numeric"
              value={numClusters}
              onChange={(e) => setNumClusters(e.target.value)}
              className="max-w-xs rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              min={1}
              max={200}
            />
          </label>
        </div>

        {(clientError || apiError) && (
          <p className="mt-4 rounded-lg border border-red-900/80 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {clientError ?? apiError}
          </p>
        )}

        <div className="mt-6">
          <button
            type="submit"
            disabled={discover.isPending}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {discover.isPending ? "Sending…" : "Discover cohorts"}
          </button>
        </div>
      </form>

      {result && (
        <CohortTable cohorts={result.cohorts} totalUsers={result.total_users} />
      )}
    </div>
  );
}
