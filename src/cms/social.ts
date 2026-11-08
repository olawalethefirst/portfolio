import { SOCIAL_DEFAULT_DESTINATIONS, SOCIAL_PROFILES, type SocialDestinations } from "@/src/components/contact-conversation/social-profiles";

export type SocialDraft = SocialDestinations;
export type SocialErrors = Partial<Record<keyof SocialDraft, string>>;
export const initialSocial: SocialDraft = { ...SOCIAL_DEFAULT_DESTINATIONS };
export const sameSocial = (a: SocialDraft, b: SocialDraft) => SOCIAL_PROFILES.every(({ id }) => a[id] === b[id]);

export function socialProfileHref(value: string): string | undefined {
  const trimmed = value.trim();
  if (!/^https:\/\//i.test(trimmed) || /\s/.test(trimmed)) return;
  try {
    const url = new URL(trimmed);
    if (url.protocol === "https:" && url.hostname && !url.username && !url.password) return url.href;
  } catch {
    return;
  }
}

export function validateSocial(value: SocialDraft): SocialErrors {
  const errors: SocialErrors = {};
  for (const { id } of SOCIAL_PROFILES) {
    if (!socialProfileHref(value[id])) errors[id] = "Enter a complete HTTPS profile URL without sign-in credentials.";
  }
  return errors;
}
