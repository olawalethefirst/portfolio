"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@heroui/react";

export function CallbackFailureToast() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const notified = useRef(false);

  useEffect(() => {
    if (searchParams.get("error") !== "sign_in_failed" || notified.current) return;
    notified.current = true;
    toast.danger("Couldn’t sign in. Please try again.");
    const remaining = new URLSearchParams(searchParams);
    remaining.delete("error");
    const query = remaining.toString();
    router.replace(`/admin/login${query ? `?${query}` : ""}`, { scroll: false });
  }, [router, searchParams]);

  return null;
}
