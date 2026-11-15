"use client";

import { skipToken, useQuery } from "@tanstack/react-query";
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

export function useSeoRecordQuery(id?: string) {
  return useQuery({
    queryKey: [...seoQueryKey(useCmsAccount()), id],
    queryFn: id ? ({ signal }) => seoApi.read(id, signal) : skipToken,
  });
}
