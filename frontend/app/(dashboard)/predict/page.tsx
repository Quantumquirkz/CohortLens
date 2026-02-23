"use client";

import { useState, useCallback } from "react";
import { PredictForm } from "@/components/predict/predict-form";
import { PredictResult } from "@/components/predict/predict-result";
import { ExplainCard } from "@/components/predict/explain-card";
import { PredictionHistory } from "@/components/predict/prediction-history";
import { WhatIfSlider } from "@/components/predict/what-if-slider";
import type { PredictRequest, PredictResponse } from "@/lib/types";

export default function PredictPage() {
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [lastInputs, setLastInputs] = useState<PredictRequest | null>(null);
  const [showExplain, setShowExplain] = useState(false);
  const [prefill, setPrefill] = useState<Partial<PredictRequest> | undefined>(undefined);
  const [formKey, setFormKey] = useState(0);

  const handleResult = useCallback((res: PredictResponse, inputs: PredictRequest) => {
    setResult(res);
    setLastInputs(inputs);
    setShowExplain(false);
  }, []);

  const handlePrefill = useCallback((values: PredictRequest) => {
    setPrefill(values);
    setFormKey((k) => k + 1);
    setResult(null);
    setShowExplain(false);
  }, []);

  const baseValues = lastInputs
    ? {
        age: lastInputs.age,
        work_experience: lastInputs.work_experience,
        family_size: lastInputs.family_size,
        ...(lastInputs.profession ? { profession: lastInputs.profession } : {}),
      }
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Predict spending
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Get a 0-100 spending score for a customer.
        </p>
      </div>

      <PredictionHistory onPrefill={handlePrefill} />

      <PredictForm
        key={formKey}
        onResult={handleResult}
        defaultValues={prefill}
      />

      {result && (
        <PredictResult
          result={result}
          onExplain={() => setShowExplain(true)}
        />
      )}

      {lastInputs && (
        <ExplainCard params={lastInputs} trigger={showExplain} />
      )}

      <WhatIfSlider baseValues={baseValues} />
    </div>
  );
}
