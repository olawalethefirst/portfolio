"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { ApiRequestError } from "@/src/api/client";
import { useCmsAccount } from "./CmsQueryProvider";
import { socialApi } from "./social-api";
import { socialSchema, type SocialDraft } from "./social";

export const socialQueryKey = (accountId: string) =>
  ["cms", accountId, "social"] as const;

export function useSocialQuery() {
  const queryKey = socialQueryKey(useCmsAccount());
  return useQuery({ queryKey, queryFn: ({ signal }) => socialApi.read(signal) });
}

export function useSaveSocial() {
  const queryKey = socialQueryKey(useCmsAccount());
  const client = useQueryClient();
  const saving = useRef(false);
  const mutation = useMutation({
    mutationFn: socialApi.save,
    onMutate: () => client.cancelQueries({ queryKey }),
  });

  async function save(value: SocialDraft) {
    if (saving.current) throw new Error("A save is already in progress.");
    const submitted = socialSchema.parse(value);
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
