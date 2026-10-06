"use client";

import { useRouter } from "next/navigation";

import { HeaderActionBar } from "@/src/components/ui/header-action-bar";

export function PublicationDetailsLabActionBar() {
  const router = useRouter();

  return (
    <HeaderActionBar
      backLabel="Back to component lab"
      onBack={() => router.push("/")}
    />
  );
}
