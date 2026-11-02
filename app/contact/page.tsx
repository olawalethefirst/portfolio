import type { Metadata } from "next";

import { LabThemeShell } from "../LabThemeShell";
import { ContactPreview } from "./ContactPreview";

export const metadata: Metadata = {
  title: "Contact",
  description: "Start a conversation about a project, collaboration, or question.",
};

export default function ContactPage() {
  return (
    <LabThemeShell>
      <main className="min-h-dvh bg-surface text-foreground">
        <h1 className="sr-only">Contact</h1>
        <ContactPreview />
      </main>
    </LabThemeShell>
  );
}
