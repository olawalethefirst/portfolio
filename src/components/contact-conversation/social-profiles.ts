export const SOCIAL_PROFILES = [
  { id: "github", label: "GitHub", icon: "github" },
  { id: "linkedin", label: "LinkedIn", icon: "linkedin" },
  { id: "x", label: "X", icon: "twitter-x" },
] as const;

export type SocialDestinations = Record<(typeof SOCIAL_PROFILES)[number]["id"], string>;
export const SOCIAL_DEFAULT_DESTINATIONS: SocialDestinations = {
  github: "https://github.com/olawalethefirst",
  linkedin: "https://www.linkedin.com/in/olawalethefirst",
  x: "https://x.com/olawalethefirst",
};
