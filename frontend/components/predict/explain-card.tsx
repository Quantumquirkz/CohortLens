"use client";

import { useMutation } from "@tanstack/react-query";
import { getExplain } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";
import { formatNumber } from "@/lib/utils";
import type { ExplainParams, ExplainResponse } from "@/lib/types";

interface ExplainCardProps {
  params: ExplainParams;
  trigger: boolean;
}

export function ExplainCard({ params, trigger }: ExplainCardProps) {
  const mutation = useMutation({
    mutationFn: () => getExplain(params),
  });

  useEffect(() => {
    if (trigger && !mutation.data && !mutation.isPending) {
      mutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  if (!trigger) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Feature importance</CardTitle>
      </CardHeader>
      <CardContent>
        {mutation.isPending && (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}
        {mutation.isError && (
          <p className="text-sm text-destructive">Failed to load explanation.</p>
        )}
        {mutation.data && <FeatureBars data={mutation.data} />}
      </CardContent>
    </Card>
  );
}

function FeatureBars({ data }: { data: ExplainResponse }) {
  const entries = Object.entries(data.feature_importance).sort(
    (a, b) => Math.abs(b[1]) - Math.abs(a[1])
  );
  const maxVal = Math.max(...entries.map(([, v]) => Math.abs(v)), 0.01);

  return (
    <div className="flex flex-col gap-2">
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-center gap-3 text-sm">
          <span className="w-32 shrink-0 truncate text-muted-foreground">{key}</span>
          <div className="flex-1">
            <div
              className="h-4 rounded-sm bg-primary/80"
              style={{
                width: `${(Math.abs(value) / maxVal) * 100}%`,
                minWidth: "2px",
              }}
            />
          </div>
          <span className="w-14 shrink-0 text-right font-mono text-xs">
            {formatNumber(value, 4)}
          </span>
        </div>
      ))}
    </div>
  );
}
