"use client";

import { socialImageSrc, socialProfileHref, validateSocial, type SocialRecord } from "@/src/cms/social";
import { ContactConversationForm } from "@/src/components/contact-conversation/ContactConversationForm";
import { ContactCompletion, ContactIntroduction, ContactSection } from "@/src/components/contact-conversation/ContactSection";
import { SocialLinks } from "@/src/components/contact-conversation/SocialLinks";
import { CmsPreviewLinks } from "./CmsPreviewLinks";

export function ContactPreview({ records }: { records: readonly SocialRecord[] }) {
  const incomplete = records.some((record) => Object.keys(validateSocial(record)).length);
  const profiles = records.map((record) => ({ id: record.id, label: record.name.trim() || "Untitled profile", href: socialProfileHref(record.url), imageSrc: socialImageSrc(record.imageSrc), icon: record.icon }));
  return <>
    <p role="status" className="p-4 text-sm text-muted">Preview only — form submissions are simulated. No message is sent.{!records.length ? " No contact profiles yet." : incomplete ? " Incomplete profiles use placeholders; invalid URLs cannot be opened." : ""}</p>
    <CmsPreviewLinks><ContactSection>
      <ContactIntroduction><SocialLinks profiles={profiles} /></ContactIntroduction>
      <ContactConversationForm>
        <ContactCompletion>Demo submission complete. No message was sent.</ContactCompletion>
      </ContactConversationForm>
    </ContactSection></CmsPreviewLinks>
  </>;
}
