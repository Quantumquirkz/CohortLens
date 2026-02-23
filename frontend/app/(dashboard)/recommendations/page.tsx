"use client";

import { useState, useCallback } from "react";
import { RecommendationInput } from "@/components/recommendations/recommendation-input";
import { RecommendationResult } from "@/components/recommendations/recommendation-result";
import { RecommendationHistory } from "@/components/recommendations/recommendation-history";
import type { RecommendationHistoryItem } from "@/lib/types";

export default function RecommendationsPage() {
  const [history, setHistory] = useState<RecommendationHistoryItem[]>([]);
  const [latest, setLatest] = useState<string | null>(null);

  const handleResult = useCallback((query: string, recommendation: string) => {
    setLatest(recommendation);
    setHistory((prev) => [{ query, recommendation }, ...prev].slice(0, 5));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          AI recommendations
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask a question in natural language and get CRM advice.
        </p>
      </div>

      <RecommendationHistory
        items={history}
        onClear={() => {
          setHistory([]);
          setLatest(null);
        }}
      />

      <RecommendationInput onResult={handleResult} />

      {latest && <RecommendationResult recommendation={latest} />}
    </div>
  );
}
