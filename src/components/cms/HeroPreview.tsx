"use client";

import { PrismHeroLayout } from "@/src/components/prism-fiber/ui/hero/PrismHeroLayout";
import type { HeroDraft } from "@/src/cms/hero";
import { CmsPreviewLinks } from "./CmsPreviewLinks";

export function HeroPreview({ value }: { value: HeroDraft }) {
  return <CmsPreviewLinks resolveHref={(href) => href === "#work" ? "/#work" : href}>
    <PrismHeroLayout mode="preview" content={value} allowsCameraZoom={false} />
  </CmsPreviewLinks>;
}
