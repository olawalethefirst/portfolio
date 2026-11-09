import { z } from "zod";
import { SOCIAL_DEFAULT_DESTINATIONS, SOCIAL_PROFILES } from "@/src/components/contact-conversation/social-profiles";

const profileUrl = z.string().refine((value) => Boolean(socialProfileHref(value)),
  "Enter a complete HTTPS profile URL without sign-in credentials.");
export const socialSchema = z.object({ github: profileUrl, linkedin: profileUrl, x: profileUrl });
export type SocialDraft = z.infer<typeof socialSchema>;
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
  const result = socialSchema.safeParse(value);
  if (result.success) return {};
  const { fieldErrors } = z.flattenError(result.error);
  const errors: SocialErrors = {};
  for (const { id } of SOCIAL_PROFILES) {
    const message = fieldErrors[id]?.[0];
    if (message) errors[id] = message;
  }
  return errors;
}
