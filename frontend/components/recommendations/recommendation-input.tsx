"use client";

import { useMutation } from "@tanstack/react-query";
import { postRecommendations } from "@/lib/api";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface RecommendationInputProps {
  onResult: (query: string, recommendation: string) => void;
}

export function RecommendationInput({ onResult }: RecommendationInputProps) {
  const [query, setQuery] = useState("");

  const mutation = useMutation({
    mutationFn: postRecommendations,
    onSuccess: (data) => {
      onResult(query, data.recommendation);
      setQuery("");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to get recommendation.");
    },
  });

  function handleSubmit() {
    if (!query.trim()) return;
    mutation.mutate({ query });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rec-query">Your question</Label>
        <Textarea
          id="rec-query"
          placeholder="e.g. What are the best segments for upselling?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={3}
        />
      </div>
      <Button
        onClick={handleSubmit}
        disabled={mutation.isPending || !query.trim()}
      >
        {mutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
        Get recommendation
      </Button>
    </div>
  );
}
