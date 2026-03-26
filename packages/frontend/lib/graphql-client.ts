import { GraphQLClient } from "graphql-request";

import { API_BASE_URL } from "@/lib/api";

export const USE_GRAPHQL_READS =
  String(process.env.NEXT_PUBLIC_USE_GRAPHQL_READS || "").toLowerCase() === "true";

export function graphqlEndpoint(): string {
  return `${API_BASE_URL}/graphql`;
}

export function createGraphqlClient(): GraphQLClient {
  return new GraphQLClient(graphqlEndpoint(), {
    headers: {
      "Content-Type": "application/json",
    },
  });
}

