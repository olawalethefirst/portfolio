import type { Metadata } from "next";
import { connection } from "next/server";
import { readSocial } from "@/src/db/social";

import { LabThemeShell } from "../LabThemeShell";
import { ContactPreview } from "./ContactPreview";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Start a conversation about a project, collaboration, or question.",
};

export default async function ContactPage() {
  await connection();
  const destinations = await readSocial();
  if (!destinations) throw new Error("Social content was not found.");
  return (
    <LabThemeShell>
      <main className="min-h-dvh bg-surface text-foreground">
        <h1 className="sr-only">Contact</h1>
        <ContactPreview destinations={destinations} />
      </main>
    </LabThemeShell>
  );
}
