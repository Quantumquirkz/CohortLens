"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

import {
  useAddCaseNote,
  usePatchRiskCase,
  useRiskCase,
  useRiskCaseGraph,
} from "@/hooks/useRiskDashboard";

export default function RiskCaseDetailPage() {
  const params = useParams();
  const rawId = params?.id;
  const caseId =
    typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : undefined;
  const { data, isLoading, error } = useRiskCase(caseId);
  const { data: graph } = useRiskCaseGraph(caseId);
  const patch = usePatchRiskCase(caseId);
  const addNote = useAddCaseNote(caseId);
  const [author, setAuthor] = useState("analyst");
  const [body, setBody] = useState("");

  if (!caseId) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      <Link href="/risk" className="text-sm text-cyan-300 hover:underline">
        ← Casos
      </Link>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
      {error && (
        <p className="text-sm text-red-300">No se pudo cargar el caso.</p>
      )}

      {data && (
        <>
          <header className="space-y-2">
            <h1 className="text-xl font-semibold">Caso {data.id.slice(0, 8)}…</h1>
            <p className="font-mono text-sm text-muted-foreground">{data.address}</p>
            <p className="text-sm">Estado: {data.status}</p>
          </header>

          <section className="space-y-2 rounded-2xl border border-border/60 bg-card/40 p-4">
            <h2 className="text-sm font-medium text-foreground">Actualizar estado</h2>
            <div className="flex flex-wrap gap-2">
              {(["open", "in_review", "resolved", "false_positive"] as const).map(
                (s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={patch.isPending}
                    onClick={() => void patch.mutateAsync({ status: s })}
                    className="rounded-full border border-border px-3 py-1 text-xs hover:bg-card"
                  >
                    {s}
                  </button>
                ),
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {(["true_positive", "false_positive", "suspicious", "unknown"] as const).map(
                (l) => (
                  <button
                    key={l}
                    type="button"
                    disabled={patch.isPending}
                    onClick={() => void patch.mutateAsync({ analyst_label: l })}
                    className="rounded-full border border-amber-500/30 px-3 py-1 text-xs text-amber-100 hover:bg-amber-500/10"
                  >
                    {l}
                  </button>
                ),
              )}
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-border/60 bg-card/40 p-4">
            <h2 className="text-sm font-medium">Grafo MVP</h2>
            {!graph && (
              <p className="text-xs text-muted-foreground">Sin datos de grafo.</p>
            )}
            {graph && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs uppercase text-muted-foreground">Nodos</p>
                  <ul className="space-y-1 font-mono text-xs">
                    {graph.nodes.map((n) => (
                      <li key={n.id}>
                        {n.kind}: {n.label}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-2 text-xs uppercase text-muted-foreground">Aristas</p>
                  <ul className="space-y-1 font-mono text-xs">
                    {graph.edges.map((e, i) => (
                      <li key={i}>
                        {e.source.slice(0, 10)}… → {e.target.slice(0, 10)}… ({e.kind})
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </section>

          <section className="space-y-3 rounded-2xl border border-border/60 bg-card/40 p-4">
            <h2 className="text-sm font-medium">Notas (auditoría)</h2>
            <ul className="space-2 text-sm">
              {data.notes.map((n) => (
                <li key={n.id} className="rounded-lg border border-border/40 bg-background/50 p-2">
                  <span className="text-xs text-muted-foreground">
                    {n.author} · {new Date(n.created_at).toLocaleString()}
                  </span>
                  <p className="mt-1 whitespace-pre-wrap">{n.body}</p>
                </li>
              ))}
            </ul>
            <div className="space-y-2 border-t border-border/40 pt-3">
              <input
                className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Autor"
              />
              <textarea
                className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm"
                rows={3}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Nota…"
              />
              <button
                type="button"
                disabled={addNote.isPending || !body.trim()}
                onClick={() => {
                  void addNote.mutateAsync({ author, body }).then(() => setBody(""));
                }}
                className="rounded-full bg-cyan-500/15 px-4 py-1.5 text-sm text-cyan-100 ring-1 ring-cyan-500/30"
              >
                Añadir nota
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
