import { DEFAULT_SOCIAL_LINKS, type SocialLinkProfile } from "@/src/components/contact-conversation/social-profiles";

export interface SocialDraft { name: string; url: string; imageSrc: string; icon?: SocialLinkProfile["icon"] }
export interface SocialRecord extends SocialDraft { id: string }
export type SocialErrors = Partial<Record<"name" | "url" | "imageSrc", string>>;
export const emptySocial = (): SocialDraft => ({ name: "", url: "", imageSrc: "" });
export const initialSocial = (): SocialRecord[] => DEFAULT_SOCIAL_LINKS.map((profile) => ({ id: profile.id, name: profile.label, url: profile.href ?? "", imageSrc: "", icon: profile.icon }));
export const sameSocial = (a: SocialDraft, b: SocialDraft) => a.name === b.name && a.url === b.url && a.imageSrc === b.imageSrc && a.icon === b.icon;
export const socialImageSrc = (value: string) => /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/]+=*$/i.test(value) ? value : undefined;

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
  if (!value.name.trim()) errors.name = "Enter a profile name.";
  if (!socialProfileHref(value.url)) errors.url = "Enter a complete HTTPS profile URL without sign-in credentials.";
  if (value.imageSrc ? !socialImageSrc(value.imageSrc) : !value.icon) errors.imageSrc = "Choose a JPEG, PNG or WebP profile image.";
  return errors;
}
