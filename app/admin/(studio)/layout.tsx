import { CmsShell } from "@/src/components/cms/CmsShell";
import { SeoProvider } from "@/src/cms/SeoProvider";
import { SocialProvider } from "@/src/cms/SocialProvider";
import { AboutProvider } from "@/src/cms/AboutProvider";
import { ProjectProvider } from "@/src/cms/ProjectProvider";
import { CmsProvider } from "@/src/cms/CmsProvider";
import type { ReactNode } from "react";
import { CmsQueryProvider } from "@/src/cms/CmsQueryProvider";

export default function StudioLayout({ children }: { children: ReactNode }) {
  // Proxy admits only this verified owner. This ID scopes storage/cache, not access.
  const accountId = process.env.ADMIN_USER_ID?.trim();
  if (!accountId) throw new Error("Studio owner is not configured.");
  return <CmsQueryProvider accountId={accountId}><CmsProvider><ProjectProvider><AboutProvider><SocialProvider><SeoProvider><CmsShell>{children}</CmsShell></SeoProvider></SocialProvider></AboutProvider></ProjectProvider></CmsProvider></CmsQueryProvider>;
}
