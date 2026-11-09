import { CmsShell } from "@/src/components/cms/CmsShell";
import { SeoProvider } from "@/src/cms/SeoProvider";
import { SocialProvider } from "@/src/cms/SocialProvider";
import { AboutProvider } from "@/src/cms/AboutProvider";
import { HeroProvider } from "@/src/cms/HeroProvider";
import { ProjectProvider } from "@/src/cms/ProjectProvider";
import { CmsProvider } from "@/src/cms/CmsProvider";
import type { ReactNode } from "react";

export default function StudioLayout({ children }: { children: ReactNode }) {
  return <CmsProvider><ProjectProvider><HeroProvider><AboutProvider><SocialProvider><SeoProvider><CmsShell>{children}</CmsShell></SeoProvider></SocialProvider></AboutProvider></HeroProvider></ProjectProvider></CmsProvider>;
}
