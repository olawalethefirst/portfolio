import "server-only";
import type { Metadata } from "next";
import { connection } from "next/server";
import { readSeoByPath } from "@/src/db/seo";
import { normalizeSeoPath, resolveSeo } from "./content";

export async function readSeoMetadata(path: string): Promise<Metadata> {
  const normalized = normalizeSeoPath(path);
  if (!normalized) throw new Error("Invalid SEO metadata path.");
  await connection();
  const [defaults, override] = await Promise.all([
    readSeoByPath("/"),
    normalized === "/" ? null : readSeoByPath(normalized),
  ]);
  if (!defaults) throw new Error("SEO defaults were not found.");
  const { title, description } = resolveSeo(defaults, override ?? defaults);
  return { title, description };
}
