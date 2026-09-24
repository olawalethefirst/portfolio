import type { Metadata } from "next";

import { PrismPresentation } from "@/src/components/prism-fiber/ui/PrismPresentation";

export const metadata: Metadata = {
  title: "Prism Fiber Lab",
};

export default function PrismFiberLabPage() {
  return <PrismPresentation />;
}
