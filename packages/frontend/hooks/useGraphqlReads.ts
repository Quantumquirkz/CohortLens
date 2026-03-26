"use client";

import { useQuery } from "@tanstack/react-query";
import { gql } from "graphql-request";

import { createGraphqlClient } from "@/lib/graphql-client";
import type { LensPublic } from "@/types/model";

const client = createGraphqlClient();

type ModelsQuery = {
  models: {
    total: number;
    hasNextPage: boolean;
    page: number;
    pageSize: number;
    items: GraphqlModel[];
  };
};

type ModelQuery = {
  model: GraphqlModel | null;
};
type GraphqlModel = {
  id: number;
  owner: string;
  name: string;
  description: string;
  modelHash: string;
  hfRepoId?: string | null;
  pricePerQueryWei: number;
  modelFormat: string;
  modelType: string;
  active: boolean;
};


type HomeStatusQuery = {
  homeStatus: {
    apiStatus: string;
    modelsCount: number;
    chainCount: number;
    defaultChain: string;
    warnings: string[];
  };
};

type DashboardSummaryQuery = {
  dashboardSummary: {
    protocol: string;
    chain: string;
    startBlock: number;
    endBlock: number;
    totalUsers: number;
    totalVolume: number;
    avgGas: number;
    txCount: number;
    warnings: string[];
  };
};

const MODELS_QUERY = gql`
  query Models($q: String, $page: Int!, $pageSize: Int!) {
    models(q: $q, page: $page, pageSize: $pageSize, sortBy: "id", sortDir: "asc") {
      total
      hasNextPage
      page
      pageSize
      items {
        id
        owner
        name
        description
        modelHash
        hfRepoId
        pricePerQueryWei
        modelFormat
        modelType
        active
      }
    }
  }
`;

const MODEL_QUERY = gql`
  query Model($id: Int!) {
    model(id: $id) {
      id
      owner
      name
      description
      modelHash
      hfRepoId
      pricePerQueryWei
      modelFormat
      modelType
      active
    }
  }
`;

const HOME_STATUS_QUERY = gql`
  query HomeStatus {
    homeStatus {
      apiStatus
      modelsCount
      chainCount
      defaultChain
      warnings
    }
  }
`;

const DASHBOARD_SUMMARY_QUERY = gql`
  query DashboardSummary(
    $protocol: String!
    $chain: String!
    $startBlock: Int!
    $endBlock: Int!
  ) {
    dashboardSummary(
      protocol: $protocol
      chain: $chain
      startBlock: $startBlock
      endBlock: $endBlock
    ) {
      protocol
      chain
      startBlock
      endBlock
      totalUsers
      totalVolume
      avgGas
      txCount
      warnings
    }
  }
`;

function toLens(raw: GraphqlModel): LensPublic {
  return {
    id: raw.id,
    owner: raw.owner,
    name: raw.name,
    description: raw.description,
    model_hash: raw.modelHash,
    hf_repo_id: raw.hfRepoId ?? null,
    price_per_query_wei: raw.pricePerQueryWei,
    model_format: raw.modelFormat,
    model_type: raw.modelType,
    active: raw.active,
  };
}

export function useGraphqlModels(search: string, page = 1, pageSize = 100) {
  return useQuery({
    queryKey: ["graphql", "models", search, page, pageSize],
    queryFn: async () => {
      const data = await client.request<ModelsQuery>(MODELS_QUERY, {
        q: search.trim() || null,
        page,
        pageSize,
      });
      return {
        ...data.models,
        items: data.models.items.map(toLens),
      };
    },
    staleTime: 30_000,
  });
}

export function useGraphqlModel(modelId: number) {
  return useQuery({
    queryKey: ["graphql", "model", modelId],
    queryFn: async () => {
      const data = await client.request<ModelQuery>(MODEL_QUERY, { id: modelId });
      return data.model ? toLens(data.model) : null;
    },
    enabled: Number.isFinite(modelId) && modelId > 0,
    staleTime: 30_000,
  });
}

export function useGraphqlHomeStatus() {
  return useQuery({
    queryKey: ["graphql", "homeStatus"],
    queryFn: async () => {
      const data = await client.request<HomeStatusQuery>(HOME_STATUS_QUERY);
      return data.homeStatus;
    },
    staleTime: 30_000,
    retry: 1,
  });
}

export function useGraphqlDashboardSummary(args: {
  protocol: string;
  chain: string;
  startBlock: number;
  endBlock: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: [
      "graphql",
      "dashboardSummary",
      args.protocol,
      args.chain,
      args.startBlock,
      args.endBlock,
    ],
    queryFn: async () => {
      const data = await client.request<DashboardSummaryQuery>(DASHBOARD_SUMMARY_QUERY, {
        protocol: args.protocol,
        chain: args.chain,
        startBlock: args.startBlock,
        endBlock: args.endBlock,
      });
      return data.dashboardSummary;
    },
    enabled:
      (args.enabled ?? true) &&
      args.protocol.trim().length > 0 &&
      Number.isFinite(args.startBlock) &&
      Number.isFinite(args.endBlock),
    staleTime: 15_000,
  });
}

