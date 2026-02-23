"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download } from "lucide-react";

interface SegmentResultTableProps {
  data: Record<string, number | string>[];
  clusters: number[];
}

const PAGE_SIZE = 50;

export function SegmentResultTable({ data, clusters }: SegmentResultTableProps) {
  const [showAll, setShowAll] = useState(false);

  const columns = useMemo(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);

  const visibleRows = showAll ? data : data.slice(0, PAGE_SIZE);

  function exportCSV() {
    const header = [...columns, "Cluster"].join(",");
    const rows = data.map((row, i) => {
      const values = columns.map((col) => {
        const v = row[col];
        return typeof v === "string" && v.includes(",") ? `"${v}"` : String(v);
      });
      values.push(String(clusters[i] ?? ""));
      return values.join(",");
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "segments.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Segment results</CardTitle>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="mr-2 size-4" />
          Export as CSV
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Row #</TableHead>
                {columns.map((col) => (
                  <TableHead key={col}>{col}</TableHead>
                ))}
                <TableHead>Cluster</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  {columns.map((col) => (
                    <TableCell key={col}>{String(row[col])}</TableCell>
                  ))}
                  <TableCell>
                    <Badge variant="secondary">{clusters[i]}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {data.length > PAGE_SIZE && !showAll && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <span>Showing first {PAGE_SIZE} of {data.length}</span>
            <Button variant="link" size="sm" onClick={() => setShowAll(true)}>
              Show all
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
