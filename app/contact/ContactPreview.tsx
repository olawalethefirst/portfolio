"use client";

import { ContactConversationSection } from "@/src/components/contact-conversation";
import { socialProfileHref } from "@/src/cms/social";
import type { SocialDestinations } from "@/src/components/contact-conversation/social-profiles";

export function ContactPreview({
  destinations,
}: {
  destinations: SocialDestinations;
}) {
  return (
    <ContactConversationSection
      destinations={{
        github: socialProfileHref(destinations.github),
        linkedin: socialProfileHref(destinations.linkedin),
        x: socialProfileHref(destinations.x),
      }}
    />
  );
}
