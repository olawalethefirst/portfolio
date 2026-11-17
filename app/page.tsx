import { connection } from "next/server";
import { readAbout } from "@/src/db/about";
import { readHero } from "@/src/db/hero";
import { listPublishedProjects } from "@/src/db/projects";
import { listPublishedPublications } from "@/src/db/publications";
import { readSeoMetadata } from "@/src/seo/metadata";
import { PrismHeroLayoutLab } from "./PrismHeroLayoutLab";

export async function generateMetadata() {
  return readSeoMetadata("/");
}

export default async function Home() {
  await connection();
  const [content, about, projects, publications] = await Promise.all([
    readHero(),
    readAbout(),
    listPublishedProjects(),
    listPublishedPublications(),
  ]);
  if (!content) throw new Error("Hero content was not found.");
  if (!about) throw new Error("About content was not found.");
  return (
    <PrismHeroLayoutLab
      content={content}
      about={about}
      projects={projects}
      publications={publications}
    />
  );
}
