"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

import { cohortDiscoverUrl } from "@/lib/api";
import type { CohortDiscoverRequest, CohortResponse } from "@/types/cohort";

async function postDiscover(
  body: CohortDiscoverRequest,
): Promise<CohortResponse> {
  const { data } = await axios.post<CohortResponse>(cohortDiscoverUrl(), body, {
    headers: { "Content-Type": "application/json" },
    timeout: 120_000,
  });
  return data;
}

/**
 * React Query mutation for cohort discovery; caches last successful result per request payload.
 */
export function useCohortApi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["cohorts", "discover"],
    mutationFn: postDiscover,
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        ["cohorts", "discover", "last", variables],
        data,
      );
    },
  });
}
