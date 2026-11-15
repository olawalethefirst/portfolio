import { connection } from "next/server";
import { readAbout } from "@/src/db/about";
import { readHero } from "@/src/db/hero";
import { readSeoMetadata } from "@/src/seo/metadata";
import { PrismHeroLayoutLab } from "./PrismHeroLayoutLab";

export async function generateMetadata() {
  return readSeoMetadata("/");
}

export default async function Home() {
  await connection();
  const [content, about] = await Promise.all([readHero(), readAbout()]);
  if (!content) throw new Error("Hero content was not found.");
  if (!about) throw new Error("About content was not found.");
  return <PrismHeroLayoutLab content={content} about={about} />;
}
