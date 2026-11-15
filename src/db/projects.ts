import "server-only";
import { asc, eq } from "drizzle-orm";
import { integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import type { ProjectDraft, ProjectRecord } from "@/src/cms/projects";
import { getDb } from "./client";

// Query mappings only; supabase/migrations remains the schema authority.
const projects = pgTable("projects", {
  id: uuid("id").primaryKey(),
  position: integer("position").notNull(),
  name: text("name").notNull(),
  summary: text("summary").notNull(),
  what: text("what").notNull(),
  how: text("how").notNull(),
  platform: text("platform").notNull(),
  screenshotAssetId: uuid("screenshot_asset_id"),
  screenshotAlt: text("screenshot_alt").notNull(),
  liveUrl: text("live_url").notNull(),
});

const publishedProjects = pgTable("published_projects", {
  projectId: uuid("project_id").primaryKey(),
  name: text("name").notNull(),
  summary: text("summary").notNull(),
  what: text("what").notNull(),
  how: text("how").notNull(),
  platform: text("platform").notNull(),
  screenshotAssetId: uuid("screenshot_asset_id"),
  screenshotAlt: text("screenshot_alt").notNull(),
  liveUrl: text("live_url").notNull(),
});

function draft(row: typeof projects.$inferSelect): ProjectDraft {
  return {
    name: row.name,
    summary: row.summary,
    what: row.what,
    how: row.how,
    platform: row.platform as ProjectDraft["platform"],
    screenshot: row.screenshotAssetId ? `/media/${row.screenshotAssetId}` : "",
    screenshotAlt: row.screenshotAlt,
    liveUrl: row.liveUrl,
  };
}

function published(row: typeof publishedProjects.$inferSelect): ProjectDraft {
  return {
    name: row.name,
    summary: row.summary,
    what: row.what,
    how: row.how,
    platform: row.platform as ProjectDraft["platform"],
    screenshot: row.screenshotAssetId ? `/media/${row.screenshotAssetId}` : "",
    screenshotAlt: row.screenshotAlt,
    liveUrl: row.liveUrl,
  };
}

function record(
  row: typeof projects.$inferSelect,
  publishedRow: typeof publishedProjects.$inferSelect | undefined,
): ProjectRecord {
  return {
    id: row.id,
    draft: draft(row),
    published: publishedRow ? published(publishedRow) : null,
  };
}

export async function listProjects(): Promise<ProjectRecord[]> {
  const rows = await getDb()
    .select({ project: projects, published: publishedProjects })
    .from(projects)
    .leftJoin(publishedProjects, eq(projects.id, publishedProjects.projectId))
    .orderBy(asc(projects.position), asc(projects.id));

  return rows.map(({ project, published: publishedRow }) =>
    record(project, publishedRow ?? undefined),
  );
}

export async function readProject(id: string): Promise<ProjectRecord | null> {
  const [row] = await getDb()
    .select({ project: projects, published: publishedProjects })
    .from(projects)
    .leftJoin(publishedProjects, eq(projects.id, publishedProjects.projectId))
    .where(eq(projects.id, id));

  return row ? record(row.project, row.published ?? undefined) : null;
}
