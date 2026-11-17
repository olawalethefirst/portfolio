"use client";

import { useRouter } from "next/navigation";

import { HeaderActionBar } from "@/src/components/ui/header-action-bar";

export function PublicationActionBar({ className }: { className?: string }) {
  const router = useRouter();

  return (
    <HeaderActionBar
      backLabel="Back to home"
      onBack={() => router.push("/")}
      buttonClassName={className}
    />
  );
}
