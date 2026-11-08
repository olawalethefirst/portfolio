"use client";

import Image from "next/image";
import { Link2 } from "lucide-react";
import { Link } from "@heroui/react";
import { socialIconPaths } from "./social-icons";
import { DEFAULT_SOCIAL_LINKS, type SocialLinkProfile } from "./social-profiles";

export function SocialProfileIcon({ profile }: { profile: SocialLinkProfile }) {
  if (profile.imageSrc) return <Image src={profile.imageSrc} alt="" width={20} height={20} className="size-5 object-contain" />;
  if (profile.icon) return <svg aria-hidden="true" className="size-5" fill="currentColor" viewBox="0 0 16 16"><path d={socialIconPaths[profile.icon]} /></svg>;
  return <Link2 aria-hidden="true" className="size-5" />;
}

export function SocialLinks({ profiles = DEFAULT_SOCIAL_LINKS }: { profiles?: readonly SocialLinkProfile[] }) {
  return <nav aria-label="Social links" className="flex flex-wrap items-center gap-3">
    {profiles.map((profile) => <Link key={profile.id} aria-label={`Visit ${profile.label} profile (opens in a new tab)`}
      className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface/80 text-accent transition-colors data-[focus-visible=true]:ring-2 data-[focus-visible=true]:ring-focus/35 data-[hovered=true]:bg-surface-secondary"
      href={profile.href} isDisabled={!profile.href} rel="noopener noreferrer" target="_blank">
      <SocialProfileIcon profile={profile} />
    </Link>)}
  </nav>;
}
