"use client";

import { useQuery } from "@tanstack/react-query";
import { getUsage } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function UsageCard() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["usage"],
    queryFn: getUsage,
    staleTime: 60_000,
  });

  const calls =
    data && typeof data.current_month_calls === "number"
      ? data.current_month_calls.toLocaleString()
      : "\u2014";

  return (
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
          </div>
        )}
        {isError && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-muted-foreground">Tenant</dt>
            <dd className="text-foreground">{"\u2014"}</dd>
            <dt className="text-muted-foreground">API calls</dt>
            <dd className="text-foreground">{"\u2014"}</dd>
          </dl>
        )}
        {data && (
          <div className="flex flex-col gap-3">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-muted-foreground">Tenant</dt>
              <dd className="text-foreground">{data.tenant_id}</dd>
              <dt className="text-muted-foreground">API calls</dt>
              <dd className="text-foreground">{calls}</dd>
            </dl>
            <p className="text-xs text-muted-foreground">
              Premium endpoints count toward your plan limit.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
