"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { ApiRequestError } from "@/src/api/client";
import { useCmsAccount } from "./CmsQueryProvider";
import { heroApi } from "./hero-api";
import { heroSchema, type HeroDraft } from "./hero";

export const heroQueryKey = (accountId: string) => ["cms", accountId, "hero"] as const;

export function useHeroQuery() {
  const queryKey = heroQueryKey(useCmsAccount());
  return useQuery({ queryKey, queryFn: ({ signal }) => heroApi.read(signal) });
}

export function useSaveHero() {
  const queryKey = heroQueryKey(useCmsAccount());
  const client = useQueryClient();
  const saving = useRef(false);
  const mutation = useMutation({
    mutationFn: heroApi.save,
    onMutate: () => client.cancelQueries({ queryKey }),
  });

  async function save(value: HeroDraft) {
    if (saving.current) throw new Error("A save is already in progress.");
    const submitted = heroSchema.parse(value);
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

  return { save, pending: mutation.isPending, error: mutation.error, reset: mutation.reset };
}
