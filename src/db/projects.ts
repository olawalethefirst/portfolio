import "server-only";
import { asc, eq } from "drizzle-orm";
import { integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import type { ProjectDraft, ProjectRecord } from "@/src/cms/projects";
import { getDb } from "./client";

// Query mappings only; supabase/migrations remains the schema authority.
const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  position: integer("position").notNull().default(0),
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

type ProjectInput = ProjectDraft;

function projectValues(value: ProjectInput) {
  const screenshotAssetId =
    value.screenshot.match(/^\/media\/([0-9a-f-]{36})$/i)?.[1] ?? null;
  return {
    name: value.name,
    summary: value.summary,
    what: value.what,
    how: value.how,
    platform: value.platform,
    screenshotAssetId,
    screenshotAlt: value.screenshotAlt,
    liveUrl: value.liveUrl,
  };
}

export async function insertProject(
  value: ProjectInput,
): Promise<ProjectRecord> {
  const [row] = await getDb()
    .insert(projects)
    .values(projectValues(value))
    .returning();
  if (!row) throw new Error("Project insert did not return content.");
  return record(row, undefined);
}

export async function updateProject(
  id: string,
  value: ProjectInput,
): Promise<ProjectRecord | null> {
  const [row] = await getDb()
    .update(projects)
    .set(projectValues(value))
    .where(eq(projects.id, id))
    .returning();
  return row ? record(row, undefined) : null;
}

export async function upsertPublishedProject(
  id: string,
  value: ProjectDraft,
): Promise<ProjectDraft | null> {
  const values = { projectId: id, ...projectValues(value) };
  const [row] = await getDb()
    .insert(publishedProjects)
    .values(values)
    .onConflictDoUpdate({
      target: publishedProjects.projectId,
      set: projectValues(value),
    })
    .returning();
  return row ? published(row) : null;
}

export async function saveAndPublishProject(
  id: string,
  value: ProjectDraft,
): Promise<ProjectRecord | null> {
  return getDb().transaction(async (tx) => {
    const [saved] = await tx
      .update(projects)
      .set(projectValues(value))
      .where(eq(projects.id, id))
      .returning();
    if (!saved) return null;
    const [live] = await tx
      .insert(publishedProjects)
      .values({ projectId: id, ...projectValues(value) })
      .onConflictDoUpdate({
        target: publishedProjects.projectId,
        set: projectValues(value),
      })
      .returning();
    if (!live) throw new Error("Project publish did not return content.");
    return record(saved, live);
  });
}

export async function createAndPublishProject(
  value: ProjectDraft,
): Promise<ProjectRecord> {
  return getDb().transaction(async (tx) => {
    const [saved] = await tx
      .insert(projects)
      .values(projectValues(value))
      .returning();
    if (!saved) throw new Error("Project creation did not return content.");
    const [live] = await tx
      .insert(publishedProjects)
      .values({ projectId: saved.id, ...projectValues(value) })
      .returning();
    if (!live) throw new Error("Project publish did not return content.");
    return record(saved, live);
  });
}

export async function deletePublishedProject(
  id: string,
): Promise<ProjectDraft | null> {
  const [row] = await getDb()
    .delete(publishedProjects)
    .where(eq(publishedProjects.projectId, id))
    .returning();
  return row ? published(row) : null;
}
