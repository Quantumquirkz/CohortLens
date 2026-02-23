"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { postReport } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const METRICS = [
  { value: "mse", label: "MSE" },
  { value: "mae", label: "MAE" },
  { value: "r2", label: "R\u00B2" },
];

const FIGURES = [
  { value: "clusters", label: "Clusters" },
  { value: "correlation", label: "Correlation" },
  { value: "gender", label: "Gender" },
  { value: "savings", label: "Savings" },
];

const ReportFormSchema = z.object({
  metrics: z.array(z.string()).min(1, "Select at least one metric"),
  figures: z.array(z.string()),
  format: z.enum(["html", "pdf"]),
  upload_to_ipfs: z.boolean(),
});

type ReportFormValues = z.infer<typeof ReportFormSchema>;

interface ReportFormProps {
  onResult: (data: {
    report_id: string;
    output_path: string;
    format: string;
  }) => void;
}

export function ReportForm({ onResult }: ReportFormProps) {
  const {
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReportFormValues>({
    resolver: zodResolver(ReportFormSchema),
    defaultValues: {
      metrics: [],
      figures: [],
      format: "html",
      upload_to_ipfs: false,
    },
  });

  const selectedMetrics = watch("metrics");
  const selectedFigures = watch("figures");

  const mutation = useMutation({
    mutationFn: postReport,
    onSuccess: (data) => {
      toast.success("Report generated.");
      onResult(data);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to generate report.");
    },
  });

  function toggleArrayValue(
    field: "metrics" | "figures",
    value: string,
    current: string[]
  ) {
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setValue(field, next, { shouldValidate: true });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Report settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-foreground">Metrics</legend>
            <div className="flex flex-wrap gap-4">
              {METRICS.map((m) => (
                <label
                  key={m.value}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={selectedMetrics.includes(m.value)}
                    onCheckedChange={() =>
                      toggleArrayValue("metrics", m.value, selectedMetrics)
                    }
                  />
                  {m.label}
                </label>
              ))}
            </div>
            {errors.metrics && (
              <p className="text-xs text-destructive">{errors.metrics.message}</p>
            )}
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-foreground">Figures</legend>
            <div className="flex flex-wrap gap-4">
              {FIGURES.map((f) => (
                <label
                  key={f.value}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={selectedFigures.includes(f.value)}
                    onCheckedChange={() =>
                      toggleArrayValue("figures", f.value, selectedFigures)
                    }
                  />
                  {f.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <Label>Format</Label>
            <Controller
              control={control}
              name="format"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="html">HTML</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <Controller
            control={control}
            name="upload_to_ipfs"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
                Upload to IPFS
              </label>
            )}
          />

          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Generate report
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

interface ReportResultProps {
  data: { report_id: string; output_path: string; format: string };
}

export function ReportResult({ data }: ReportResultProps) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const reportUrl = data.output_path.startsWith("http")
    ? data.output_path
    : `${apiUrl}/${data.output_path}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Report ready</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
          <dt className="text-muted-foreground">Report ID</dt>
          <dd className="font-mono text-foreground">{data.report_id}</dd>
          <dt className="text-muted-foreground">Format</dt>
          <dd className="text-foreground">{data.format.toUpperCase()}</dd>
          <dt className="text-muted-foreground">Path</dt>
          <dd className="truncate text-foreground">{data.output_path}</dd>
        </dl>
        <Button variant="outline" asChild>
          <a href={reportUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 size-4" />
            Open report
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
