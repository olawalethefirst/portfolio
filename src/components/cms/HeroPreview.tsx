"use client";

import { PrismHeroLayout } from "@/src/components/prism-fiber/ui/hero/PrismHeroLayout";
import type { HeroDraft } from "@/src/cms/hero";

export function HeroPreview({ value }: { value: HeroDraft }) {
  return <PrismHeroLayout mode="preview" content={value} allowsCameraZoom={false} />;
}
