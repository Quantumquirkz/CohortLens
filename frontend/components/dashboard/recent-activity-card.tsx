"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import type { PredictionHistoryItem } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

export function RecentActivityCard() {
  const [lastPredict, setLastPredict] = useState<PredictionHistoryItem | null>(
    null
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem("cohortlens_predict_history");
      if (raw) {
        const arr = JSON.parse(raw) as PredictionHistoryItem[];
        if (arr.length > 0) {
          setLastPredict(arr[0]);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Recent activity</CardTitle>
      </CardHeader>
      <CardContent>
        {lastPredict ? (
          <p className="text-sm text-foreground">
            Last prediction: score{" "}
            <span className="font-semibold">
              {formatNumber(lastPredict.result.predicted_spending)}
            </span>{" "}
            <Link href="/predict" className="text-primary underline underline-offset-4">
              View
            </Link>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            No recent activity yet. Use Predict or Segment to get started.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
