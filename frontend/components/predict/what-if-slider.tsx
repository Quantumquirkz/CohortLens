"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { postPredict } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { formatNumber, formatCurrency } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { PredictRequest } from "@/lib/types";

interface WhatIfSliderProps {
  baseValues: Omit<PredictRequest, "annual_income"> | null;
}

export function WhatIfSlider({ baseValues }: WhatIfSliderProps) {
  const [income, setIncome] = useState(50000);
  const [score, setScore] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mutation = useMutation({
    mutationFn: postPredict,
    onSuccess: (data) => {
      setScore(data.predicted_spending);
    },
  });

  const debouncedPredict = useCallback(
    (value: number) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (!baseValues) return;
        mutation.mutate({
          ...baseValues,
          annual_income: value,
        });
      }, 300);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [baseValues]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  if (!baseValues) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">What-if analysis</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label>Annual income: {formatCurrency(income)}</Label>
          <Slider
            min={20000}
            max={150000}
            step={1000}
            value={[income]}
            onValueChange={([v]) => {
              setIncome(v);
              debouncedPredict(v);
            }}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatCurrency(20000)}</span>
            <span>{formatCurrency(150000)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {mutation.isPending && <Loader2 className="size-4 animate-spin text-primary" />}
          {score !== null && !mutation.isPending && (
            <p className="text-foreground">
              Estimated score:{" "}
              <span className="font-semibold text-primary">{formatNumber(score, 1)}</span>
            </p>
          )}
          {score === null && !mutation.isPending && (
            <p className="text-muted-foreground">
              Move the slider to see the predicted score.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
