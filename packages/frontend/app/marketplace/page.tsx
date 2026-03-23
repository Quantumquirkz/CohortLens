"use client";

import { useState } from "react";

import { MarketplaceTable } from "@/components/cohort/MarketplaceTable";
import { useModelsList } from "@/hooks/useModelsApi";

export default function MarketplacePage() {
  const [syncChain, setSyncChain] = useState(false);
  const { data, isLoading, error, isFetching } = useModelsList(syncChain);

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-indigo-400">
            Marketplace
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white">
            Modelos registrados
          </h1>
          <p className="mt-2 max-w-2xl text-slate-400">
            Lista desde la API. Con contrato configurado puedes alinear la caché
            con Sepolia antes de listar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSyncChain(false)}
            className={`rounded-lg border px-4 py-2 text-sm transition ${
              !syncChain
                ? "border-indigo-500 bg-indigo-950/50 text-indigo-100"
                : "border-slate-700 text-slate-300 hover:border-slate-500"
            }`}
          >
            Solo caché DB
          </button>
          <button
            type="button"
            onClick={() => setSyncChain(true)}
            className={`rounded-lg border px-4 py-2 text-sm transition ${
              syncChain
                ? "border-indigo-500 bg-indigo-950/50 text-indigo-100"
                : "border-slate-700 text-slate-300 hover:border-slate-500"
            }`}
          >
            Sincronizar cadena
          </button>
        </div>
      </div>

      {isLoading && <p className="text-slate-400">Cargando modelos…</p>}
      {isFetching && !isLoading && (
        <p className="mb-4 text-xs text-slate-500">Actualizando…</p>
      )}
      {error && (
        <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-200">
          No se pudo cargar la lista. Comprueba NEXT_PUBLIC_API_URL y que el
          backend esté en marcha.
        </p>
      )}
      {data && <MarketplaceTable models={data} />}
    </section>
  );
}
