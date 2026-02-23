"use client";

import { useQuery } from "@tanstack/react-query";
import { getUsage } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const PLAN_LIMIT = 10000;

export default function UsagePage() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["usage"],
    queryFn: getUsage,
    staleTime: 60_000,
  });

  const calls =
    data && typeof data.current_month_calls === "number"
      ? data.current_month_calls
      : null;

  const percentage = calls !== null ? Math.min((calls / PLAN_LIMIT) * 100, 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          API usage
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor your current API consumption and plan limits.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            {"This month's usage"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isPending && (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-6 w-full" />
            </div>
          )}
          {isError && (
            <div className="flex flex-col gap-3">
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>Unable to fetch usage data.</AlertDescription>
              </Alert>
              <button
                onClick={() => refetch()}
                className="text-sm text-primary underline underline-offset-4"
              >
                Retry
              </button>
            </div>
          )}
          {data && (
            <div className="flex flex-col gap-4">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Tenant</dt>
                <dd className="text-foreground">{data.tenant_id}</dd>
                <dt className="text-muted-foreground">API calls</dt>
                <dd className="text-foreground">
                  {calls !== null ? calls.toLocaleString() : "\u2014"}
                </dd>
                <dt className="text-muted-foreground">Plan limit</dt>
                <dd className="text-foreground">{PLAN_LIMIT.toLocaleString()}</dd>
              </dl>

              {calls !== null && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{calls.toLocaleString()} / {PLAN_LIMIT.toLocaleString()}</span>
                    <span>{percentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Premium endpoints count toward your plan limit.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
