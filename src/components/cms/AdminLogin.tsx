"use client";

import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Button } from "@/src/components/ui/Button";

interface AdminLoginProps {
  onSignIn?: () => Promise<void>;
  accessDenied?: boolean;
}

export function AdminLogin({ onSignIn, accessDenied = false }: AdminLoginProps) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const signingIn = useRef(false);
  const feedbackId = useId();
  const unavailable = !onSignIn;
  const error = failed ? "Couldn’t sign in. Please try again."
    : accessDenied ? "This account doesn’t have admin access." : "";

  async function signIn() {
    if (!onSignIn || signingIn.current) return;
    signingIn.current = true;
    setPending(true);
    setFailed(false);
    try {
      await onSignIn();
    } catch {
      setFailed(true);
    } finally {
      signingIn.current = false;
      setPending(false);
    }
  }

  return <main className="grid min-h-dvh place-items-center bg-background px-6 py-12 text-foreground">
    <div className="w-full max-w-[25rem] text-center">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">Content Studio</h1>
      <Button fullWidth variant="outline" isDisabled={unavailable || pending} isLoading={pending}
        aria-describedby={error ? feedbackId : undefined}
        className="h-11 gap-2.5 border-[#747775] bg-white px-3 text-sm font-medium text-[#1f1f1f] [font-family:'Google_Sans',Arial,sans-serif]"
        startContent={<span aria-hidden="true" className="relative size-5 shrink-0 overflow-hidden">
          <Image src="/brand/google-signin.png" alt="" width={40} height={40} unoptimized
            className="absolute -top-2.5 -left-2.5 max-w-none" />
        </span>}
        onPress={() => void signIn()}>
        Continue with Google
      </Button>
      {pending ? <p role="status" className="mt-4 text-sm text-muted">Signing in…</p> : null}
      {error ? <p id={feedbackId} role="alert" className="mt-4 text-sm text-danger">{error}</p> : null}
      <div className="mt-6">
        <Button href="/" variant="ghost" startContent={<ArrowLeft aria-hidden="true" className="size-4" />}>
          Back to portfolio
        </Button>
      </div>
    </div>
  </main>;
}
