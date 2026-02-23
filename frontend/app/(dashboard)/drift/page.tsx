"use client";

import { useMutation } from "@tanstack/react-query";
import { getDrift, postSaveBaseline } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, AlertCircle, CheckCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { formatNumber } from "@/lib/utils";
import type { DriftResponse } from "@/lib/types";

export default function DriftPage() {
  const [driftResult, setDriftResult] = useState<DriftResponse | null>(null);

  const driftMutation = useMutation({
    mutationFn: getDrift,
    onSuccess: (data) => setDriftResult(data),
    onError: (err: Error) => toast.error(err.message || "Failed to check drift."),
  });

  const baselineMutation = useMutation({
    mutationFn: postSaveBaseline,
    onSuccess: (data) => {
      toast.success("Baseline saved.");
      if (data.baseline_path) {
        toast.info(`Path: ${data.baseline_path}`);
      }
    },
    onError: (err: Error) => toast.error(err.message || "Failed to save baseline."),
  });

  const features = driftResult?.features
    ? Object.entries(driftResult.features)
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Data drift
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Compare current data to a saved baseline.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => driftMutation.mutate()}
          disabled={driftMutation.isPending}
        >
          {driftMutation.isPending && (
            <Loader2 className="mr-2 size-4 animate-spin" />
          )}
          Check drift
        </Button>
        <Button
          variant="outline"
          onClick={() => baselineMutation.mutate()}
          disabled={baselineMutation.isPending}
        >
          {baselineMutation.isPending && (
            <Loader2 className="mr-2 size-4 animate-spin" />
          )}
          Save baseline
        </Button>
      </div>

      {driftMutation.isPending && (
        <Card>
          <CardContent className="py-6">
            <div className="flex flex-col gap-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </CardContent>
        </Card>
      )}

      {driftResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              Drift analysis
              <Badge
                variant={driftResult.drift_detected ? "destructive" : "default"}
              >
                {driftResult.drift_detected ? "Yes" : "No"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {driftResult.message === "No baseline available" && (
              <Alert>
                <Info className="size-4" />
                <AlertDescription>
                  Save a baseline first after training your model.
                </AlertDescription>
              </Alert>
            )}

            {driftResult.alerts && driftResult.alerts.length > 0 && (
              <div className="flex flex-col gap-1">
                {driftResult.alerts.map((alert, i) => (
                  <Alert key={i} variant="destructive">
                    <AlertCircle className="size-4" />
                    <AlertDescription>{alert}</AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {features.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Feature</TableHead>
                      <TableHead>PSI</TableHead>
                      <TableHead>KS p-value</TableHead>
                      <TableHead>Drift</TableHead>
                      <TableHead>Current mean</TableHead>
                      <TableHead>Baseline mean</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {features.map(([name, feat]) => (
                      <TableRow key={name}>
                        <TableCell className="font-medium">{name}</TableCell>
                        <TableCell>{formatNumber(feat.psi, 4)}</TableCell>
                        <TableCell>{formatNumber(feat.ks_p_value, 4)}</TableCell>
                        <TableCell>
                          {feat.drift_detected ? (
                            <AlertCircle className="size-4 text-destructive" />
                          ) : (
                            <CheckCircle className="size-4 text-primary" />
                          )}
                        </TableCell>
                        <TableCell>{formatNumber(feat.current_mean, 2)}</TableCell>
                        <TableCell>{formatNumber(feat.baseline_mean, 2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
