"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAudit } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";

function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max) + "..." : str;
}

export default function AuditPage() {
  const [tableName, setTableName] = useState("");
  const [recordId, setRecordId] = useState("");
  const [limit, setLimit] = useState(50);
  const [filters, setFilters] = useState({ table_name: "", record_id: "", limit: 50 });
  const [expandedValue, setExpandedValue] = useState<string | null>(null);

  function formatValue(val: Record<string, unknown> | null): string {
    if (val == null) return "\u2014";
    try {
      return typeof val === "object" ? JSON.stringify(val, null, 2) : String(val);
    } catch {
      return String(val);
    }
  }

  function displayValue(val: Record<string, unknown> | null, maxLen: number): string {
    const s = formatValue(val);
    return s.length > maxLen ? s.slice(0, maxLen) + "..." : s;
  }

  const { data, isPending, isError } = useQuery({
    queryKey: ["audit", filters.table_name, filters.record_id, filters.limit],
    queryFn: () =>
      getAudit({
        table_name: filters.table_name || undefined,
        record_id: filters.record_id || undefined,
        limit: filters.limit,
      }),
    staleTime: 10_000,
  });

  function handleApply() {
    setFilters({
      table_name: tableName,
      record_id: recordId,
      limit,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Audit log
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View recent system actions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="audit-table">Table</Label>
              <Input
                id="audit-table"
                placeholder="e.g. reports"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="audit-record">Record ID</Label>
              <Input
                id="audit-record"
                placeholder="e.g. abc123"
                value={recordId}
                onChange={(e) => setRecordId(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="audit-limit">Limit</Label>
              <Input
                id="audit-limit"
                type="number"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value) || 50)}
                className="w-24"
              />
            </div>
            <Button onClick={handleApply}>Apply</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Entries{data ? ` (${data.count})` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isPending && (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          )}
          {isError && (
            <p className="text-sm text-destructive">Failed to load audit log.</p>
          )}
          {data && data.entries.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No audit entries match your filters.
            </p>
          )}
          {data && data.entries.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Record ID</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Old values</TableHead>
                    <TableHead>New values</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono text-xs">
                        {String(entry.id)}
                      </TableCell>
                      <TableCell>{entry.table_name}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {truncate(entry.record_id, 12)}
                      </TableCell>
                      <TableCell>{entry.action}</TableCell>
                      <TableCell>
                        <button
                          type="button"
                          className="text-left text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => setExpandedValue(formatValue(entry.old_values))}
                        >
                          {displayValue(entry.old_values, 50)}
                        </button>
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          className="text-left text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => setExpandedValue(formatValue(entry.new_values))}
                        >
                          {displayValue(entry.new_values, 50)}
                        </button>
                      </TableCell>
                      <TableCell>{entry.user_id ?? "\u2014"}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {formatDate(entry.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={expandedValue !== null}
        onOpenChange={(open) => !open && setExpandedValue(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Full value</DialogTitle>
            <DialogDescription>Viewing the complete JSON value for this entry.</DialogDescription>
          </DialogHeader>
          <pre className="max-h-80 overflow-auto rounded-md bg-muted p-4 text-xs font-mono text-foreground">
            {expandedValue}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
