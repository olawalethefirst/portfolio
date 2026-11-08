import { AboutProvider } from "@/src/cms/AboutProvider";
import { HeroProvider } from "@/src/cms/HeroProvider";
import { ProjectProvider } from "@/src/cms/ProjectProvider";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CmsProvider } from "@/src/cms/CmsProvider";

export const metadata: Metadata = {
  title: "Content studio",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.CMS_DEMO_ENABLED !== "true"
  )
    notFound();
  return <CmsProvider><ProjectProvider><HeroProvider><AboutProvider>{children}</AboutProvider></HeroProvider></ProjectProvider></CmsProvider>;
}
