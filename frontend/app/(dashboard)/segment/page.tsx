"use client";

import { useState, useCallback } from "react";
import { SegmentInput } from "@/components/segment/segment-input";
import { SegmentResultTable } from "@/components/segment/segment-result-table";

export default function SegmentPage() {
  const [resultData, setResultData] = useState<Record<string, number | string>[] | null>(null);
  const [clusters, setClusters] = useState<number[] | null>(null);

  const handleResult = useCallback(
    (data: Record<string, number | string>[], cls: number[]) => {
      setResultData(data);
      setClusters(cls);
    },
    []
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Segment customers
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a JSON array of customers to get cluster labels.
        </p>
      </div>

      <SegmentInput onResult={handleResult} />

      {resultData && clusters ? (
        <SegmentResultTable data={resultData} clusters={clusters} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Paste or upload a JSON array of customers, or use sample data.
        </p>
      )}
    </div>
  );
}
