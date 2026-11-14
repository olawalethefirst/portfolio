import { connection } from "next/server";
import { readHero } from "@/src/db/hero";
import { PrismHeroLayoutLab } from "./PrismHeroLayoutLab";

export default async function Home() {
  await connection();
  const content = await readHero();
  if (!content) throw new Error("Hero content was not found.");
  return <PrismHeroLayoutLab content={content} />;
}
