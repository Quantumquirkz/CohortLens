"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { RecommendationHistoryItem } from "@/lib/types";

interface RecommendationHistoryProps {
  items: RecommendationHistoryItem[];
  onClear: () => void;
}

function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max) + "..." : str;
}

export function RecommendationHistory({ items, onClear }: RecommendationHistoryProps) {
  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">History</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear history
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {items.map((item, i) => (
          <div
            key={i}
            className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm"
          >
            <p className="font-medium text-foreground">
              Q: {truncate(item.query, 80)}
            </p>
            <p className="mt-1 text-muted-foreground">
              A: {truncate(item.recommendation, 80)}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
