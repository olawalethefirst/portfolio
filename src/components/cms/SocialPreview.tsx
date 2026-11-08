"use client";

import { socialProfileHref, type SocialDraft } from "@/src/cms/social";
import { SocialLinks } from "@/src/components/contact-conversation/SocialLinks";
import { SOCIAL_PROFILES, type SocialDestinations } from "@/src/components/contact-conversation/social-profiles";
import { CmsPreviewLinks } from "./CmsPreviewLinks";

export function SocialPreview({ value }: { value: SocialDraft }) {
  const destinations: Partial<SocialDestinations> = {};
  for (const { id } of SOCIAL_PROFILES) {
    const href = socialProfileHref(value[id]);
    if (href) destinations[id] = href;
  }
  const validCount = Object.keys(destinations).length;
  return <div className="mx-auto flex min-h-dvh max-w-6xl flex-col justify-center gap-6 px-5 py-16 sm:px-8">
    <h1 className="text-3xl font-semibold">Social profiles</h1>
    {validCount < SOCIAL_PROFILES.length ? <p role="status" className="text-sm text-muted">{validCount === 0 ? "No valid social profile URLs to preview. Add complete HTTPS URLs in the editor." : "Profiles with missing or invalid HTTPS URLs are unavailable in this preview."}</p> : null}
    <CmsPreviewLinks><SocialLinks destinations={destinations} /></CmsPreviewLinks>
  </div>;
}
