"use client";

import { ArrowLeft } from "lucide-react";
import { useEffect, useId, useRef, useState, type SubmitEvent } from "react";
import { Button } from "@/src/components/ui/Button";
import { socialIconPaths } from "@/src/components/contact-conversation/social-icons";

interface AdminLoginProps {
  returnTo?: string;
  accessDenied?: boolean;
}

export function AdminLogin({
  returnTo = "/admin",
  accessDenied = false,
}: AdminLoginProps) {
  const [pending, setPending] = useState(false);
  const signingIn = useRef(false);
  const feedbackId = useId();
  const error = accessDenied ? "This account doesn’t have admin access." : "";

  useEffect(() => {
    function restore() {
      signingIn.current = false;
      setPending(false);
    }
    window.addEventListener("pageshow", restore);
    return () => window.removeEventListener("pageshow", restore);
  }, []);

  function signIn(event: SubmitEvent<HTMLFormElement>) {
    if (signingIn.current) {
      event.preventDefault();
      return;
    }
    signingIn.current = true;
    setPending(true);
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-6 py-12 text-foreground">
      <div className="w-full max-w-[25rem] text-center">
        <h1 className="mb-8 text-3xl font-semibold tracking-tight">
          Content Studio
        </h1>
        <form
          action="/api/auth/github"
          method="post"
          aria-label="GitHub sign-in"
          onSubmit={signIn}
        >
          <input type="hidden" name="returnTo" value={returnTo} />
          <Button
            type="submit"
            fullWidth
            variant="outline"
            isDisabled={pending}
            isLoading={pending}
            aria-describedby={error ? feedbackId : undefined}
            className="h-11 gap-2.5 px-3 text-sm font-medium"
            startContent={
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="size-5 shrink-0"
              >
                <path d={socialIconPaths.github} />
              </svg>
            }
          >
            Continue with GitHub
          </Button>
        </form>
        {pending ? (
          <p role="status" className="mt-4 text-sm text-muted">
            Signing in…
          </p>
        ) : null}
        {error ? (
          <p id={feedbackId} role="alert" className="mt-4 text-sm text-danger">
            {error}
          </p>
        ) : null}
        <div className="mt-6">
          <Button
            href="/"
            variant="ghost"
            startContent={<ArrowLeft aria-hidden="true" className="size-4" />}
          >
            Back to portfolio
          </Button>
        </div>
      </div>
    </main>
  );
}
