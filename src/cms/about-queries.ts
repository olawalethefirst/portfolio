"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { ApiRequestError } from "@/src/api/client";
import { useCmsAccount } from "./CmsQueryProvider";
import { aboutApi } from "./about-api";
import { aboutSchema, type AboutDraft } from "./about";

export const aboutQueryKey = (accountId: string) =>
  ["cms", accountId, "about"] as const;

export function useAboutQuery() {
  const queryKey = aboutQueryKey(useCmsAccount());
  return useQuery({ queryKey, queryFn: ({ signal }) => aboutApi.read(signal) });
}

export function useSaveAbout() {
  const queryKey = aboutQueryKey(useCmsAccount());
  const client = useQueryClient();
  const saving = useRef(false);
  const mutation = useMutation({
    mutationFn: aboutApi.save,
    onMutate: () => client.cancelQueries({ queryKey }),
  });

  async function save(value: AboutDraft) {
    if (saving.current) throw new Error("A save is already in progress.");
    const submitted = aboutSchema.parse(value);
    saving.current = true;
    try {
      const canonical = await mutation.mutateAsync(submitted);
      client.setQueryData(queryKey, canonical);
      return canonical;
    } catch (failure) {
      if (failure instanceof ApiRequestError && failure.kind !== "server") {
        // The write may have completed even when its response was lost.
        void client.invalidateQueries({ queryKey });
      }
      throw failure;
    } finally {
      saving.current = false;
    }
  }

  return {
    save,
    pending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
