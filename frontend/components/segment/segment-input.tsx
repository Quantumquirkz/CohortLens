"use client";

import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { postSegment } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const SAMPLE_DATA = JSON.stringify(
  [
    { Age: 25, "Annual Income ($)": 50000, "Spending Score (1-100)": 45 },
    { Age: 35, "Annual Income ($)": 75000, "Spending Score (1-100)": 72 },
    { Age: 45, "Annual Income ($)": 120000, "Spending Score (1-100)": 88 },
  ],
  null,
  2
);

interface SegmentInputProps {
  onResult: (
    data: Record<string, number | string>[],
    clusters: number[]
  ) => void;
}

export function SegmentInput({ onResult }: SegmentInputProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const mutation = useMutation({
    mutationFn: postSegment,
    onSuccess: (data) => {
      try {
        const parsed = JSON.parse(value) as Record<string, number | string>[];
        onResult(parsed, data.clusters);
      } catch {
        // fallback
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Segmentation failed.");
    },
  });

  function handleSegment() {
    setError(null);
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) {
        setError("Input must be a JSON array.");
        return;
      }
      mutation.mutate(parsed);
    } catch {
      setError("Invalid JSON. Please check your input.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Customer data</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="segment-data">Customer data (JSON array)</Label>
          <Textarea
            ref={textareaRef}
            id="segment-data"
            rows={10}
            placeholder={`[{"Age": 25, "Annual Income ($)": 50000, "Spending Score (1-100)": 45}, ...]`}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            className="font-mono text-sm"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setValue(SAMPLE_DATA);
              setError(null);
            }}
          >
            Use sample data
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setValue("");
              setError(null);
            }}
          >
            Clear
          </Button>
          <Button onClick={handleSegment} disabled={mutation.isPending || !value.trim()}>
            {mutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Segment
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
