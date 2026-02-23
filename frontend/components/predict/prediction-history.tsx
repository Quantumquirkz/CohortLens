"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";
import { formatNumber, formatCurrency } from "@/lib/utils";
import type { PredictionHistoryItem, PredictRequest } from "@/lib/types";

interface PredictionHistoryProps {
  onPrefill: (values: PredictRequest) => void;
}

export function PredictionHistory({ onPrefill }: PredictionHistoryProps) {
  const [items, setItems] = useState<PredictionHistoryItem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("cohortlens_predict_history");
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  if (items.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="flex w-full items-center gap-2">
            <ChevronRight
              className={`size-4 transition-transform ${open ? "rotate-90" : ""}`}
            />
            <CardTitle className="text-lg font-semibold">
              Recent predictions
            </CardTitle>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="flex flex-col gap-2">
              {items.map((item, i) => (
                <div
                  key={item.timestamp ?? i}
                  className="flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2 text-sm"
                >
                  <span className="text-foreground">
                    Age {item.inputs.age}, Income{" "}
                    {formatCurrency(item.inputs.annual_income)} →{" "}
                    <span className="font-semibold">
                      {formatNumber(item.result.predicted_spending, 1)}
                    </span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onPrefill(item.inputs)}
                  >
                    Use again
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
