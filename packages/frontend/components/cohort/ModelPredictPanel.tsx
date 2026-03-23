"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchPredictionStatus, useModelPredict } from "@/hooks/useModelsApi";
import type { LensPublic } from "@/types/model";

type Props = {
  model: LensPublic;
};

function parseFeatures(input: string): number[] | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) {
        return null;
      }
      const nums = parsed.map((x) => Number(x));
      if (nums.some((n) => Number.isNaN(n))) {
        return null;
      }
      return nums;
    } catch {
      return null;
    }
  }
  const parts = trimmed.split(/[\s,]+/).filter(Boolean);
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => Number.isNaN(n))) {
    return null;
  }
  return nums;
}

export function ModelPredictPanel({ model }: Props) {
  const [rawFeatures, setRawFeatures] = useState("0, 0, 0, 0");
  const [asyncMode, setAsyncMode] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const predict = useModelPredict();

  const features = useMemo(() => parseFeatures(rawFeatures), [rawFeatures]);

  const poll = useQuery({
    queryKey: ["models", "prediction", taskId],
    queryFn: () => fetchPredictionStatus(taskId!),
    enabled: Boolean(taskId),
    refetchInterval: (q) => {
      const st = q.state.data?.state;
      if (st === "SUCCESS" || st === "FAILURE") {
        return false;
      }
      return 800;
    },
  });

  useEffect(() => {
    if (!predict.isSuccess || !predict.data?.async_mode || !predict.data.task_id) {
      return;
    }
    setTaskId(predict.data.task_id);
  }, [predict.isSuccess, predict.data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTaskId(null);
    if (!features) {
      return;
    }
    void predict.mutateAsync({
      modelId: model.id,
      features,
      asyncMode,
    });
  };

  const syncResult =
    predict.data && !predict.data.async_mode ? predict.data.result : null;
  const asyncResult =
    poll.data?.state === "SUCCESS" ? poll.data.result : null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
      <h2 className="text-lg font-semibold text-white">Inferencia</h2>
      <p className="mt-1 text-sm text-slate-400">
        Vector numérico (coma o JSON). Con la cartera conectada se envía firma
        EIP-191 si el backend lo exige.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-xs font-medium uppercase text-slate-500">
            Características
          </span>
          <textarea
            value={rawFeatures}
            onChange={(e) => setRawFeatures(e.target.value)}
            rows={4}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="0.1, 0.2 o [0.1, 0.2]"
          />
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={asyncMode}
            onChange={(e) => setAsyncMode(e.target.checked)}
            className="rounded border-slate-600"
          />
          Cola asíncrona (Celery)
        </label>

        <button
          type="submit"
          disabled={!features || predict.isPending}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {predict.isPending ? "Ejecutando…" : "Ejecutar predicción"}
        </button>
      </form>

      {features === null && rawFeatures.trim() !== "" && (
        <p className="mt-4 text-sm text-amber-200">
          Formato no válido. Usa números separados por comas o un array JSON.
        </p>
      )}

      {predict.isError && (
        <pre className="mt-4 overflow-x-auto rounded-lg bg-red-950/40 p-3 text-xs text-red-100">
          {String(predict.error)}
        </pre>
      )}

      {syncResult && (
        <pre className="mt-4 overflow-x-auto rounded-lg bg-slate-950/80 p-4 font-mono text-sm text-emerald-100">
          {JSON.stringify(syncResult, null, 2)}
        </pre>
      )}

      {taskId && poll.isFetching && (
        <p className="mt-4 text-sm text-slate-400">
          Tarea {taskId}: {poll.data?.state ?? "PENDING"}…
        </p>
      )}

      {asyncResult && (
        <pre className="mt-4 overflow-x-auto rounded-lg bg-slate-950/80 p-4 font-mono text-sm text-emerald-100">
          {JSON.stringify(asyncResult, null, 2)}
        </pre>
      )}
    </div>
  );
}
