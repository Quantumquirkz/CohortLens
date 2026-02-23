"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { postPredict } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { PredictRequest, PredictResponse, PredictionHistoryItem } from "@/lib/types";

const PredictFormSchema = z.object({
  age: z.coerce.number().min(18, "Must be at least 18").max(120, "Must be 120 or less"),
  annual_income: z.coerce.number().min(0, "Must be 0 or more"),
  work_experience: z.coerce.number().min(0, "Must be 0 or more"),
  family_size: z.coerce.number().min(1, "Must be at least 1"),
  profession: z.string().optional(),
});

type PredictFormValues = z.infer<typeof PredictFormSchema>;

interface PredictFormProps {
  onResult: (result: PredictResponse, inputs: PredictRequest) => void;
  defaultValues?: Partial<PredictFormValues>;
}

export function PredictForm({ onResult, defaultValues }: PredictFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PredictFormValues>({
    resolver: zodResolver(PredictFormSchema),
    defaultValues: {
      age: defaultValues?.age ?? undefined,
      annual_income: defaultValues?.annual_income ?? undefined,
      work_experience: defaultValues?.work_experience ?? undefined,
      family_size: defaultValues?.family_size ?? undefined,
      profession: defaultValues?.profession ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: postPredict,
    onSuccess: (data, variables) => {
      onResult(data, variables);
      // Save to history
      try {
        const raw = localStorage.getItem("cohortlens_predict_history");
        const history: PredictionHistoryItem[] = raw ? JSON.parse(raw) : [];
        history.unshift({
          inputs: variables,
          result: data,
          timestamp: Date.now(),
        });
        localStorage.setItem(
          "cohortlens_predict_history",
          JSON.stringify(history.slice(0, 5))
        );
        localStorage.setItem("cohortlens_last_predict", JSON.stringify(data));
      } catch {
        // ignore
      }
    },
    onError: (error: Error) => {
      if (error.message.includes("429") || error.message.toLowerCase().includes("limit")) {
        toast.error("Plan limit exceeded. Try again later.");
      } else {
        toast.error("Request failed. Check inputs and try again.");
      }
    },
  });

  function onSubmit(values: PredictFormValues) {
    const body: PredictRequest = {
      age: values.age,
      annual_income: values.annual_income,
      work_experience: values.work_experience,
      family_size: values.family_size,
      ...(values.profession ? { profession: values.profession } : {}),
    };
    mutation.mutate(body);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Customer features</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="age">Age</Label>
              <Input id="age" type="number" placeholder="e.g. 30" {...register("age")} />
              {errors.age && (
                <p className="text-xs text-destructive">{errors.age.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="annual_income">Annual income ($)</Label>
              <Input
                id="annual_income"
                type="number"
                placeholder="e.g. 60000"
                {...register("annual_income")}
              />
              {errors.annual_income && (
                <p className="text-xs text-destructive">{errors.annual_income.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="work_experience">Work experience (years)</Label>
              <Input
                id="work_experience"
                type="number"
                placeholder="e.g. 5"
                {...register("work_experience")}
              />
              {errors.work_experience && (
                <p className="text-xs text-destructive">{errors.work_experience.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="family_size">Family size</Label>
              <Input
                id="family_size"
                type="number"
                placeholder="e.g. 3"
                {...register("family_size")}
              />
              {errors.family_size && (
                <p className="text-xs text-destructive">{errors.family_size.message}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profession">Profession</Label>
            <Input
              id="profession"
              type="text"
              placeholder="e.g. Engineer (optional)"
              {...register("profession")}
            />
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Predict
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => reset()}
            >
              Clear
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
