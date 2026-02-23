"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { postConsent, getConsent } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { formatDate } from "@/lib/utils";

// --- Register form ---

const ConsentRegisterSchema = z.object({
  customer_id: z.string().min(1, "Customer ID is required"),
  consent_type: z.string().min(1, "Select a consent type"),
  granted: z.boolean(),
});

type ConsentRegisterValues = z.infer<typeof ConsentRegisterSchema>;

function ConsentRegisterForm() {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ConsentRegisterValues>({
    resolver: zodResolver(ConsentRegisterSchema),
    defaultValues: {
      customer_id: "",
      consent_type: "data_share",
      granted: false,
    },
  });

  const mutation = useMutation({
    mutationFn: postConsent,
    onSuccess: () => {
      toast.success("Consent recorded.");
      reset();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to register consent.");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Register consent</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit((v) => mutation.mutate(v))}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="consent-cid">Customer ID</Label>
            <Input
              id="consent-cid"
              placeholder="e.g. CUST-001"
              {...register("customer_id")}
            />
            {errors.customer_id && (
              <p className="text-xs text-destructive">
                {errors.customer_id.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Consent type</Label>
            <Controller
              control={control}
              name="consent_type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="data_share">Data share</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="analytics">Analytics</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.consent_type && (
              <p className="text-xs text-destructive">
                {errors.consent_type.message}
              </p>
            )}
          </div>

          <Controller
            control={control}
            name="granted"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
                Granted
              </label>
            )}
          />

          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && (
              <Loader2 className="mr-2 size-4 animate-spin" />
            )}
            Register consent
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// --- Check form ---

function ConsentCheckForm() {
  const [customerId, setCustomerId] = useState("");
  const [consentType, setConsentType] = useState("");
  const [searchParams, setSearchParams] = useState<{
    id: string;
    type?: string;
  } | null>(null);

  const { data, isPending, isError } = useQuery({
    queryKey: ["consent", searchParams?.id, searchParams?.type],
    queryFn: () =>
      getConsent(searchParams!.id, searchParams!.type || undefined),
    enabled: !!searchParams,
    staleTime: 10_000,
  });

  function handleCheck() {
    if (!customerId.trim()) return;
    setSearchParams({
      id: customerId.trim(),
      type: consentType || undefined,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Check consent</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="check-cid">Customer ID</Label>
            <Input
              id="check-cid"
              placeholder="e.g. CUST-001"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-48"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Consent type (optional)</Label>
            <Select value={consentType} onValueChange={setConsentType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="data_share">Data share</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="analytics">Analytics</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleCheck} disabled={!customerId.trim()}>
            Check
          </Button>
        </div>

        {isPending && searchParams && (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        )}

        {isError && (
          <p className="text-sm text-destructive">Failed to check consent.</p>
        )}

        {data && data.consents.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No consent records found for this customer.
          </p>
        )}

        {data && data.consents.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Consent type</TableHead>
                  <TableHead>Granted</TableHead>
                  <TableHead>Created at</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.consents.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell>{c.consent_type}</TableCell>
                    <TableCell>
                      <Badge variant={c.granted ? "default" : "secondary"}>
                        {c.granted ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {c.created_at ? formatDate(c.created_at) : "\u2014"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Page ---

export default function ConsentPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Consent (SSI/DID)
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registro verificable de consentimiento (SSI/DID) para Web3.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ConsentRegisterForm />
        <ConsentCheckForm />
      </div>
    </div>
  );
}
