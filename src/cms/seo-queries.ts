"use client";

import { useQuery } from "@tanstack/react-query";
import { useCmsAccount } from "./CmsQueryProvider";
import { seoApi } from "./seo-api";

export const seoQueryKey = (accountId: string) =>
  ["cms", accountId, "seo"] as const;

export function useSeoQuery() {
  return useQuery({
    queryKey: seoQueryKey(useCmsAccount()),
    queryFn: ({ signal }) => seoApi.list(signal),
  });
}
