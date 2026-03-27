"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import axios from "axios";

import {
  riskCaseGraphUrl,
  riskCaseUrl,
  riskCasesUrl,
  riskHeaders,
  riskScreenUrl,
} from "@/lib/risk-api";
import type {
  RiskCaseDetail,
  RiskCaseSummary,
  RiskGraphMvp,
  RiskScreenRequest,
  RiskScreenResponse,
} from "@/types/risk";

export function useRiskCases(filters?: { status?: string; chain_id?: string }) {
  return useQuery({
    queryKey: ["risk", "cases", filters],
    queryFn: async (): Promise<RiskCaseSummary[]> => {
      const { data } = await axios.get<RiskCaseSummary[]>(riskCasesUrl(filters), {
        headers: riskHeaders(),
        timeout: 30_000,
      });
      return data;
    },
  });
}

export function useRiskCase(caseId: string | undefined) {
  return useQuery({
    queryKey: ["risk", "case", caseId],
    enabled: Boolean(caseId),
    queryFn: async (): Promise<RiskCaseDetail> => {
      const { data } = await axios.get<RiskCaseDetail>(riskCaseUrl(caseId!), {
        headers: riskHeaders(),
        timeout: 30_000,
      });
      return data;
    },
  });
}

export function useRiskCaseGraph(caseId: string | undefined) {
  return useQuery({
    queryKey: ["risk", "case", caseId, "graph"],
    enabled: Boolean(caseId),
    queryFn: async (): Promise<RiskGraphMvp> => {
      const { data } = await axios.get<RiskGraphMvp>(riskCaseGraphUrl(caseId!), {
        headers: riskHeaders(),
        timeout: 30_000,
      });
      return data;
    },
  });
}

export function useRiskScreen() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["risk", "screen"],
    mutationFn: async (body: RiskScreenRequest): Promise<RiskScreenResponse> => {
      const { data } = await axios.post<RiskScreenResponse>(riskScreenUrl(), body, {
        headers: riskHeaders(),
        timeout: 60_000,
      });
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["risk", "cases"] });
    },
  });
}

export function usePatchRiskCase(caseId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: {
      status?: string;
      analyst_label?: string | null;
    }): Promise<RiskCaseSummary> => {
      if (!caseId) {
        throw new Error("missing case id");
      }
      const { data } = await axios.patch<RiskCaseSummary>(
        riskCaseUrl(caseId),
        patch,
        { headers: riskHeaders(), timeout: 15_000 },
      );
      return data;
    },
    onSuccess: (_data, _vars) => {
      if (caseId) {
        void qc.invalidateQueries({ queryKey: ["risk", "case", caseId] });
      }
      void qc.invalidateQueries({ queryKey: ["risk", "cases"] });
    },
  });
}

export function useAddCaseNote(caseId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { author: string; body: string }) => {
      if (!caseId) {
        throw new Error("missing case id");
      }
      const { data } = await axios.post(
        `${riskCaseUrl(caseId)}/notes`,
        body,
        { headers: riskHeaders(), timeout: 15_000 },
      );
      return data;
    },
    onSuccess: () => {
      if (caseId) {
        void qc.invalidateQueries({ queryKey: ["risk", "case", caseId] });
      }
    },
  });
}
