"use client";

import { useQuery } from "@tanstack/react-query";
import { getHealth } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Activity } from "lucide-react";

export function HealthCard() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    staleTime: 30_000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">API health</CardTitle>
      </CardHeader>
      <CardContent>
        {isPending && (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}
        {isError && (
          <div className="flex flex-col gap-3">
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>Unable to reach API</AlertDescription>
            </Alert>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        )}
        {data && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              {data.status === "ok" ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="size-3.5" />
                  OK
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <Activity className="size-3.5" />
                  Degraded
                </Badge>
              )}
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-muted-foreground">Service</dt>
              <dd className="text-foreground">{data.service}</dd>
              <dt className="text-muted-foreground">Version</dt>
              <dd className="text-foreground">{data.version}</dd>
              <dt className="text-muted-foreground">Neon DB</dt>
              <dd className="text-foreground">{data.neon_db}</dd>
              <dt className="text-muted-foreground">IPFS</dt>
              <dd className="text-foreground">{data.ipfs}</dd>
            </dl>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
