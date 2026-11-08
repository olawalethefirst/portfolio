import { labProjects } from "@/src/components/project-item/lab-projects";
import { httpsUrl } from "./publications";

export interface ProjectDraft {
  name: string;
  summary: string;
  what: string;
  how: string;
  platform: "mobile" | "web";
  screenshot: string;
  screenshotAlt: string;
  decorative: boolean;
  liveUrl: string;
}
export interface ProjectRecord { id: string; draft: ProjectDraft; published: ProjectDraft | null }
export type ProjectAction = "save" | "publish" | "unpublish" | "delete";
export type ProjectErrors = Partial<Record<keyof ProjectDraft, string>>;
export function emptyProject(): ProjectDraft {
  return { name: "", summary: "", what: "", how: "", platform: "web", screenshot: "", screenshotAlt: "", decorative: false, liveUrl: "" };
}
export function initialProjects(): ProjectRecord[] {
  return labProjects.map((item) => {
    const draft: ProjectDraft = { name: item.name, summary: item.summary, what: item.what, how: item.how,
      platform: item.platform, screenshot: item.screenTextureSrc ?? "", screenshotAlt: `${item.name} interface`, decorative: false, liveUrl: item.liveHref };
    return { id: item.id, draft, published: { ...draft } };
  });
}
export function sameProject(a: ProjectDraft, b: ProjectDraft) {
  return (Object.keys(a) as (keyof ProjectDraft)[]).every((key) => a[key] === b[key]);
}
export function projectStatus(record: ProjectRecord) {
  if (!record.published) return "Draft";
  return sameProject(record.draft, record.published) ? "Published" : "Published · Unpublished changes";
}
export function validateProject(value: ProjectDraft): ProjectErrors {
  const errors: ProjectErrors = {};
  for (const key of ["name", "summary", "what", "how", "screenshot"] as const) {
    if (!value[key].trim()) errors[key] = "Complete this field before publishing.";
  }
  if (!value.decorative && !value.screenshotAlt.trim()) errors.screenshotAlt = "Describe the screenshot or mark it decorative.";
  if (!httpsUrl(value.liveUrl)) errors.liveUrl = "Enter a complete HTTPS destination.";
  return errors;
}
