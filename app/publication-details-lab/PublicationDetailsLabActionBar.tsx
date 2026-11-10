"use client";

import { useRouter } from "next/navigation";

import { HeaderActionBar } from "@/src/components/ui/header-action-bar";

export interface PublicationDetailsLabActionBarProps {
  className?: string;
}

export function PublicationDetailsLabActionBar({
  className,
}: PublicationDetailsLabActionBarProps) {
  const router = useRouter();

  return (
    <HeaderActionBar
      backLabel="Back to component lab"
      onBack={() => router.push("/")}
      buttonClassName={className}
    />
  );
}
