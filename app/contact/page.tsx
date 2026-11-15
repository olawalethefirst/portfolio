import { connection } from "next/server";
import { readSocial } from "@/src/db/social";
import { readSeoMetadata } from "@/src/seo/metadata";

import { LabThemeShell } from "../LabThemeShell";
import { ContactPreview } from "./ContactPreview";

export async function generateMetadata() {
  return readSeoMetadata("/contact");
}

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
