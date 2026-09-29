import type { Metadata } from "next";

import { PrismHeroLayoutLab } from "./PrismHeroLayoutLab";

export const metadata: Metadata = {
  title: "Prism Fiber Lab",
};

export default function PrismFiberLabPage() {
  return <PrismHeroLayoutLab />;
}
