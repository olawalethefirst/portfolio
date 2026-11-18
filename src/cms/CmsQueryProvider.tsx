"use client";

import { createContext, useContext, type ReactNode } from "react";
import { QueryProvider } from "@/src/api/QueryProvider";

const AccountContext = createContext<string | null>(null);

/** A new account remounts the boundary, discarding the previous account's cache. */
export function CmsQueryProvider({
  accountId,
  children,
}: {
  accountId: string;
  children: ReactNode;
}) {
  return (
    <QueryProvider key={accountId}>
      <AccountContext value={accountId}>{children}</AccountContext>
    </QueryProvider>
  );
}

export function useCmsAccount() {
  const accountId = useContext(AccountContext);
  if (!accountId) throw new Error("CMS queries require an account boundary.");
  return accountId;
}
