"use client";

import { socialProfileHref, type SocialDraft } from "@/src/cms/social";
import { ContactConversationForm } from "@/src/components/contact-conversation/ContactConversationForm";
import { ContactCompletion, ContactIntroduction, ContactSection } from "@/src/components/contact-conversation/ContactSection";
import { SocialLinks } from "@/src/components/contact-conversation/SocialLinks";
import { SOCIAL_PROFILES, type SocialDestinations } from "@/src/components/contact-conversation/social-profiles";

export function ContactPreview({ value }: { value: SocialDraft }) {
  const destinations: Partial<SocialDestinations> = {};
  for (const { id } of SOCIAL_PROFILES) {
    const href = socialProfileHref(value[id]);
    if (href) destinations[id] = href;
  }
  const incomplete = Object.keys(destinations).length < SOCIAL_PROFILES.length;
  return <>
    {incomplete ? <p role="status" className="p-4 text-sm text-muted">Profiles with missing or invalid HTTPS URLs are unavailable in this preview.</p> : null}
    <ContactSection>
      <ContactIntroduction><SocialLinks destinations={destinations} /></ContactIntroduction>
      <ContactConversationForm>
        <ContactCompletion>Your response is complete.</ContactCompletion>
      </ContactConversationForm>
    </ContactSection>
  </>;
}
