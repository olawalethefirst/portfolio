"use client";

import { ContactConversationSection } from "@/src/components/contact-conversation";
import { HeaderActionBar } from "@/src/components/ui/header-action-bar";
import { SectionContainer } from "@/src/components/ui/SectionContainer";
import { socialProfileHref } from "@/src/cms/social";
import type { SocialDestinations } from "@/src/components/contact-conversation/social-profiles";

export function ContactPreview({
  destinations,
}: {
  destinations: SocialDestinations;
}) {
  return (
    <>
      <SectionContainer className="pointer-events-none fixed inset-x-0 top-8 z-10">
        <HeaderActionBar buttonClassName="pointer-events-auto" />
      </SectionContainer>
      <ContactConversationSection
        destinations={{
          github: socialProfileHref(destinations.github),
          linkedin: socialProfileHref(destinations.linkedin),
          x: socialProfileHref(destinations.x),
        }}
      />
    </>
  );
}
