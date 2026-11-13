import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLogin } from "@/src/components/cms/AdminLogin";
import { CallbackFailureToast } from "@/src/components/cms/CallbackFailureToast";

export const metadata: Metadata = { title: "Content Studio" };

export default function AdminLoginPage() {
  return (
    <>
      <AdminLogin />
      <Suspense fallback={null}>
        <CallbackFailureToast />
      </Suspense>
    </>
  );
}
