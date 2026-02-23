"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RecommendationResultProps {
  recommendation: string;
}

export function RecommendationResult({ recommendation }: RecommendationResultProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Recommendation</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
          {recommendation}
        </p>
      </CardContent>
    </Card>
  );
}
