"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";

import { MarketplaceLoadingSkeleton } from "@/components/cohort/MarketplaceLoadingSkeleton";
import { MarketplaceTable } from "@/components/cohort/MarketplaceTable";
import { useGraphqlModels } from "@/hooks/useGraphqlReads";
import { useModelsList } from "@/hooks/useModelsApi";
import { USE_GRAPHQL_READS } from "@/lib/graphql-client";
import type { LensPublic } from "@/types/model";

function filterModels(models: LensPublic[], query: string): LensPublic[] {
  const q = query.trim().toLowerCase();
  if (!q) return models;
  return models.filter((m) => {
    const blob = [
      m.name,
      m.description,
      m.owner,
      m.model_format,
      m.model_type,
      String(m.id),
    ]
      .join(" ")
      .toLowerCase();
    return blob.includes(q);
  });
}

export default function MarketplacePage() {
  const [syncChain, setSyncChain] = useState(false);
  const [search, setSearch] = useState("");
  const rest = useModelsList(syncChain);
  const gql = useGraphqlModels(search, 1, 100);
  const reduceMotion = useReducedMotion();
  const usingGraphql = USE_GRAPHQL_READS;

  const filtered = useMemo(
    () => {
      if (usingGraphql) {
        return gql.data?.items ?? [];
      }
      return rest.data ? filterModels(rest.data, search) : [];
    },
    [gql.data?.items, rest.data, search, usingGraphql],
  );
  const totalCount = usingGraphql ? (gql.data?.total ?? 0) : (rest.data?.length ?? 0);
  const isLoading = usingGraphql ? gql.isLoading : rest.isLoading;
  const isFetching = usingGraphql ? gql.isFetching : rest.isFetching;
  const error = usingGraphql ? gql.error : rest.error;

  const toggleBase =
    "rounded-full border px-4 py-2 text-sm font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  const toggleInactive = `${toggleBase} border-border/15 text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground`;
  const toggleActive = `${toggleBase} border-accent/60 bg-accent/10 text-accent`;

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <motion.div
        className="surface-card mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-200">
            Marketplace
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            Registered models
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            List from the API. With the contract configured you can align the cache
            with Sepolia before listing.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSyncChain(false)}
            className={!syncChain ? toggleActive : toggleInactive}
          >
            DB cache only
          </button>
          <button
            type="button"
            onClick={() => setSyncChain(true)}
            className={syncChain ? toggleActive : toggleInactive}
          >
            Sync chain
          </button>
        </div>
      </motion.div>

      {(usingGraphql ? totalCount > 0 : rest.data && rest.data.length > 0) && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground/90">
            Search
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, owner, format…"
              className="input-field mt-1.5 max-w-md"
              autoComplete="off"
            />
          </label>
          {search.trim() && (
            <p className="mt-2 text-xs text-muted-foreground">
              {filtered.length} of {totalCount} models
            </p>
          )}
        </div>
      )}

      {isLoading && <MarketplaceLoadingSkeleton />}
      {isFetching && !isLoading && (
        <p className="mb-4 text-xs text-muted-foreground/80">Refreshing…</p>
      )}
      {error && (
        <p className="rounded-xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
          Could not load the list. Check NEXT_PUBLIC_API_URL and that the backend
          is running.
        </p>
      )}
      {(usingGraphql ? !gql.isLoading : !rest.isLoading) && (
        <MarketplaceTable models={filtered} />
      )}
    </section>
  );
}
