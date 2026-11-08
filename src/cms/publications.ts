export interface PublicationDraft {
  title: string;
  summary: string;
  kind: "local" | "external";
  bodyMarkdown: string;
  externalUrl: string;
  coverSrc: string;
  coverAlt: string;
  decorativeCover: boolean;
  tagsText: string;
  publishedOn: string;
}

export interface PublicationRecord {
  id: string;
  draft: PublicationDraft;
  published: PublicationDraft | null;
}

export type PublicationAction = "save" | "publish" | "unpublish";
export type PublicationErrors = Partial<Record<keyof PublicationDraft, string>>;

export function emptyPublication(): PublicationDraft {
  return {
    title: "",
    summary: "",
    kind: "local",
    bodyMarkdown: "",
    externalUrl: "",
    coverSrc: "",
    coverAlt: "",
    decorativeCover: false,
    tagsText: "",
    publishedOn: "",
  };
}

export function samePublication(a: PublicationDraft, b: PublicationDraft) {
  return (Object.keys(a) as (keyof PublicationDraft)[]).every(
    (key) => a[key] === b[key],
  );
}

export function publicationState(record: PublicationRecord) {
  if (!record.published) return "Draft";
  return samePublication(record.draft, record.published)
    ? "Published"
    : "Published · Unpublished changes";
}

export function applyPublicationAction(
  record: PublicationRecord,
  submitted: PublicationDraft,
  action: PublicationAction,
): PublicationRecord {
  if (action === "unpublish") return { ...record, published: null };
  return {
    ...record,
    draft: { ...submitted },
    published: action === "publish" ? { ...submitted } : record.published,
  };
}

export function publicationTags(text: string) {
  const seen = new Set<string>();
  return text
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => {
      if (!tag || seen.has(tag.toLowerCase())) return false;
      seen.add(tag.toLowerCase());
      return true;
    });
}

export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function httpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function validatePublication(
  value: PublicationDraft,
  today: string,
): PublicationErrors {
  const errors: PublicationErrors = {};
  if (!value.title.trim()) errors.title = "Add a title before publishing.";
  if (!value.summary.trim())
    errors.summary = "Add a summary before publishing.";
  if (value.kind === "local" && !value.bodyMarkdown.trim())
    errors.bodyMarkdown = "Write your article before publishing.";
  if (value.kind === "external" && !httpsUrl(value.externalUrl))
    errors.externalUrl = "Enter a complete HTTPS destination.";
  if (!value.coverSrc) errors.coverSrc = "Choose a cover image.";
  if (!value.decorativeCover && !value.coverAlt.trim())
    errors.coverAlt = "Describe the cover, or mark it as decorative.";
  if (!validDate(value.publishedOn))
    errors.publishedOn = "Choose a valid publication date.";
  else if (value.publishedOn > today)
    errors.publishedOn =
      "Scheduling is not supported. Choose today or an earlier date.";
  return errors;
}
