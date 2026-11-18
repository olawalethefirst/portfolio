import { House } from "lucide-react";

import { Button } from "@/src/components/ui/Button";
import { SectionContainer } from "@/src/components/ui/SectionContainer";

import { PlugDisconnectedIcon } from "./PlugDisconnectedIcon";

/** One full-page layout for not-found and error screens: icon, message, way home. */
export function ErrorPage({
  title,
  message,
  actionLabel = "Back to home",
  href = "/",
}: {
  title: string;
  message: string;
  actionLabel?: string;
  href?: string;
}) {
  return (
    <main className="grid min-h-dvh place-items-center bg-surface text-foreground">
      <SectionContainer className="flex flex-col items-center py-16 text-center">
        <PlugDisconnectedIcon className="size-40 text-muted sm:size-56" />
        <h1 className="mt-8 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-md text-muted">{message}</p>
        <Button
          className="mt-8"
          href={href}
          startContent={<House aria-hidden="true" className="size-4" />}
        >
          {actionLabel}
        </Button>
      </SectionContainer>
    </main>
  );
}
