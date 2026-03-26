"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { formatEther } from "viem";

import { ModelDetailSkeleton } from "@/components/cohort/ModelDetailSkeleton";
import { ModelPredictPanel } from "@/components/cohort/ModelPredictPanel";
import { useGraphqlModel } from "@/hooks/useGraphqlReads";
import { useModelsList } from "@/hooks/useModelsApi";
import { USE_GRAPHQL_READS } from "@/lib/graphql-client";

function weiToEthLabel(wei: number): string {
  try {
    return formatEther(BigInt(Math.trunc(wei)));
  } catch {
    return String(wei);
  }
}

function ModelBreadcrumbs({
  modelName,
}: {
  modelName?: string;
}) {
  return (
    <nav
      className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground"
      aria-label="Breadcrumb"
    >
      <Link href="/" className="transition hover:text-accent">
        Home
      </Link>
      <span aria-hidden className="text-border/50">
        /
      </span>
      <Link href="/marketplace" className="transition hover:text-accent">
        Marketplace
      </Link>
      {modelName ?
        <>
          <span aria-hidden className="text-border/50">
            /
          </span>
          <span className="max-w-[200px] truncate font-medium text-foreground sm:max-w-xs">
            {modelName}
          </span>
        </>
      : null}
    </nav>
  );
}

export default function ModelDetailPage() {
  const params = useParams();
  const idParam = params?.id;
  const id =
    typeof idParam === "string"
      ? Number.parseInt(idParam, 10)
      : Array.isArray(idParam)
        ? Number.parseInt(idParam[0] ?? "", 10)
        : NaN;

  const rest = useModelsList(false);
  const gql = useGraphqlModel(id);
  const usingGraphql = USE_GRAPHQL_READS;
  const model = usingGraphql ? (gql.data ?? undefined) : rest.data?.find((m) => m.id === id);
  const isLoading = usingGraphql ? gql.isLoading : rest.isLoading;
  const error = usingGraphql ? gql.error : rest.error;

  if (Number.isNaN(id) || id < 1) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-12">
        <ModelBreadcrumbs />
        <p className="mt-6 text-destructive">Invalid model identifier.</p>
        <Link
          href="/marketplace"
          className="mt-4 inline-block text-sm font-medium text-accent transition hover:text-accent/80"
        >
          Back to marketplace
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-10">
      <ModelBreadcrumbs modelName={model?.name} />

      {isLoading && <ModelDetailSkeleton />}

      {error && (
        <p className="mt-8 text-destructive">Could not load the model list.</p>
      )}

      {model && (
        <>
          <header className="surface-card mt-6">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-200">
              Model #{model.id}
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-foreground">
              {model.name}
            </h1>
            <p className="mt-3 text-muted-foreground">{model.description}</p>
            <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
              <div className="surface-panel">
                <dt className="text-muted-foreground">Owner</dt>
                <dd className="font-mono text-xs text-card-foreground">
                  {model.owner}
                </dd>
              </div>
              <div className="surface-panel">
                <dt className="text-muted-foreground">CID / model hash</dt>
                <dd className="break-all font-mono text-xs text-card-foreground">
                  {model.model_hash}
                </dd>
              </div>
              <div className="surface-panel">
                <dt className="text-muted-foreground">Format</dt>
                <dd className="text-card-foreground">{model.model_format}</dd>
              </div>
              <div className="surface-panel">
                <dt className="text-muted-foreground">Type</dt>
                <dd className="text-card-foreground">{model.model_type || "—"}</dd>
              </div>
              <div className="surface-panel">
                <dt className="text-muted-foreground">Price per query</dt>
                <dd className="text-card-foreground">
                  {weiToEthLabel(model.price_per_query_wei)} LENS
                </dd>
              </div>
              <div className="surface-panel">
                <dt className="text-muted-foreground">Active</dt>
                <dd className="text-card-foreground">{model.active ? "Yes" : "No"}</dd>
              </div>
            </dl>
          </header>

          <div className="mt-8">
            <ModelPredictPanel model={model} />
          </div>
        </>
      )}

      {!isLoading && !error && !model && (
        <p className="mt-8 text-muted-foreground">
          Model {id} was not found. Try syncing from chain in the marketplace or
          confirm it exists in the API.
        </p>
      )}
    </section>
  );
}
