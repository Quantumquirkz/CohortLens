"use client";

import { useState } from "react";
import { ReportForm, ReportResult } from "@/components/reports/report-form";

export default function ReportsPage() {
  const [result, setResult] = useState<{
    report_id: string;
    output_path: string;
    format: string;
  } | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Generate report
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create an executive report with selected metrics and figures.
        </p>
      </div>

      <ReportForm onResult={setResult} />

      {result && <ReportResult data={result} />}
    </div>
  );
}
