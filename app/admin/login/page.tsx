import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLogin } from "@/src/components/cms/AdminLogin";
import { CallbackFailureToast } from "@/src/components/cms/CallbackFailureToast";
import { adminReturnPath } from "@/src/auth/return-path";

export const metadata: Metadata = { title: "Content Studio" };

export default async function AdminLoginPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const returnTo = adminReturnPath(typeof query.returnTo === "string" ? query.returnTo : null);
  return (
    <>
      <AdminLogin returnTo={returnTo} />
      <Suspense fallback={null}>
        <CallbackFailureToast />
      </Suspense>
    </>
  );
}
