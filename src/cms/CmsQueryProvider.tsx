"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const AccountContext = createContext<string | null>(null);

export function CmsQueryProvider({
  accountId,
  children,
}: {
  accountId: string;
  children: ReactNode;
}) {
  return (
    <AccountQueries key={accountId} accountId={accountId}>
      {children}
    </AccountQueries>
  );
}

function AccountQueries({
  accountId,
  children,
}: {
  accountId: string;
  children: ReactNode;
}) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, networkMode: "always" },
          mutations: { retry: false, networkMode: "always" },
        },
      }),
  );
  useEffect(
    () => () => {
      client.clear();
    },
    [client],
  );
  return (
    <AccountContext value={accountId}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </AccountContext>
  );
}

export function useCmsAccount() {
  const accountId = useContext(AccountContext);
  if (!accountId) throw new Error("CMS queries require an account boundary.");
  return accountId;
}
