"use client";

import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useRef } from "react";
import { ApiRequestError } from "@/src/api/client";
import {
  seoInputSchema,
  type SeoInput,
  type SeoRecord,
} from "@/src/seo/content";
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

export function useSaveSeoRecord(id?: string) {
  const queryKey = seoQueryKey(useCmsAccount());
  const client = useQueryClient();
  const saving = useRef(false);
  const mutation = useMutation({
    mutationFn: (body: SeoInput) => {
      if (!id) throw new Error("The saved SEO record is unavailable.");
      return seoApi.save(id, body);
    },
    onMutate: () => client.cancelQueries({ queryKey }),
  });
  async function save(value: SeoInput) {
    if (saving.current) throw new Error("A save is already in progress.");
    const submitted = seoInputSchema.parse(value);
    saving.current = true;
    try {
      const canonical = await mutation.mutateAsync(submitted);
      client.setQueryData([...queryKey, id], canonical);
      client.setQueryData<SeoRecord[]>(queryKey, (records) =>
        records?.map((record) =>
          record.id === canonical.id ? canonical : record,
        ),
      );
      return canonical;
    } catch (failure) {
      if (failure instanceof ApiRequestError && failure.kind !== "server") {
        // A lost response does not establish whether the write completed.
        void client.invalidateQueries({ queryKey });
      }
      throw failure;
    } finally {
      saving.current = false;
    }
  }
  return { save, pending: mutation.isPending };
}
