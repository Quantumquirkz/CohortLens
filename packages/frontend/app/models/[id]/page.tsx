"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { formatEther } from "viem";

import { ModelPredictPanel } from "@/components/cohort/ModelPredictPanel";
import { useModelsList } from "@/hooks/useModelsApi";

function weiToEthLabel(wei: number): string {
  try {
    return formatEther(BigInt(Math.trunc(wei)));
  } catch {
    return String(wei);
  }
}

export default function ModelDetailPage() {
  const params = useParams();
  const idParam = params.id;
  const id =
    typeof idParam === "string"
      ? Number.parseInt(idParam, 10)
      : Array.isArray(idParam)
        ? Number.parseInt(idParam[0] ?? "", 10)
        : NaN;

  const { data: models, isLoading, error } = useModelsList(false);

  const model = models?.find((m) => m.id === id);

  if (Number.isNaN(id) || id < 1) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-red-200">Identificador de modelo no válido.</p>
        <Link href="/marketplace" className="mt-4 inline-block text-indigo-400">
          Volver al marketplace
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/marketplace"
        className="text-sm text-indigo-400 transition hover:text-indigo-300"
      >
        ← Marketplace
      </Link>

      {isLoading && (
        <p className="mt-8 text-slate-400">Cargando modelo…</p>
      )}
      {error && (
        <p className="mt-8 text-red-200">
          No se pudo cargar el listado de modelos.
        </p>
      )}

      {model && (
        <>
          <header className="mt-6 border-b border-slate-800 pb-6">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-indigo-400">
              Modelo #{model.id}
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">
              {model.name}
            </h1>
            <p className="mt-3 text-slate-400">{model.description}</p>
            <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Propietario</dt>
                <dd className="font-mono text-xs text-slate-200">
                  {model.owner}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">CID / hash modelo</dt>
                <dd className="break-all font-mono text-xs text-slate-200">
                  {model.model_hash}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Formato</dt>
                <dd className="text-slate-200">{model.model_format}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Tipo</dt>
                <dd className="text-slate-200">{model.model_type || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Precio por consulta</dt>
                <dd className="text-slate-200">
                  {weiToEthLabel(model.price_per_query_wei)} ETH
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Activo</dt>
                <dd className="text-slate-200">{model.active ? "Sí" : "No"}</dd>
              </div>
            </dl>
          </header>

          <div className="mt-8">
            <ModelPredictPanel model={model} />
          </div>
        </>
      )}

      {!isLoading && !error && !model && (
        <p className="mt-8 text-slate-400">
          No se encontró el modelo {id}. Prueba a sincronizar desde cadena en el
          marketplace o verifica que exista en la API.
        </p>
      )}
    </section>
  );
}
