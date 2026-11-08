"use client";

import { Maximize2, Plus } from "lucide-react";
import { Button } from "@/src/components/ui/Button";

export function CmsCollectionActions({ collection, onNew, onPreview, pending }: {
  collection: "publication" | "project";
  onNew: () => void;
  onPreview: () => void;
  pending: boolean;
}) {
  return <div className="flex flex-wrap gap-2">
    <Button id={`${collection}-section-trigger`} variant="outline" isDisabled={pending} onPress={onPreview}
      startContent={<Maximize2 aria-hidden="true" className="size-4" />}>Preview {collection}s</Button>
    <Button onPress={onNew} startContent={<Plus aria-hidden="true" className="size-4" />}>New {collection}</Button>
  </div>;
}
