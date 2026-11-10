"use client";

import { Link } from "@heroui/react";
import { socialIconPaths } from "./social-icons";
import { SOCIAL_PROFILES, SOCIAL_DEFAULT_DESTINATIONS, type SocialDestinations } from "./social-profiles";

export function SocialLinks({ destinations = SOCIAL_DEFAULT_DESTINATIONS }: { destinations?: Partial<SocialDestinations> }) {
  return (
    <nav aria-label="Social links" className="flex items-center gap-3">
      {SOCIAL_PROFILES.map(({ id, icon, label }) => (
        <Link
          aria-label={`Visit ${label} profile (opens in a new tab)`}
          className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface/80 text-accent transition-colors data-[focus-visible=true]:ring-2 data-[focus-visible=true]:ring-focus/35 data-[hovered=true]:bg-surface-secondary"
          href={destinations[id]}
          isDisabled={!destinations[id]}
          key={label}
          rel="noopener noreferrer"
          target="_blank"
        >
          <svg aria-hidden="true" className="size-5" fill="currentColor" viewBox="0 0 16 16">
            <path d={socialIconPaths[icon]} />
          </svg>
        </Link>
      ))}
    </nav>
  );
}
