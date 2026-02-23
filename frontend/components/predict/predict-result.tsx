"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";
import type { PredictResponse } from "@/lib/types";

interface PredictResultProps {
  result: PredictResponse;
  onExplain: () => void;
}

export function PredictResult({ result, onExplain }: PredictResultProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Prediction result</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-3xl font-bold text-primary">
            {formatNumber(result.predicted_spending, 1)}
          </p>
          <p className="text-sm text-muted-foreground">Predicted spending score</p>
        </div>
        <p className="text-sm text-foreground">
          Confidence: <span className="font-medium">{typeof result.confidence === "string" ? result.confidence : formatNumber(result.confidence, 2)}</span>
        </p>
        <Button variant="outline" onClick={onExplain}>
          Explain this prediction
        </Button>
      </CardContent>
    </Card>
  );
}
