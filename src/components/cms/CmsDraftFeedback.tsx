"use client";

import type { PersistenceStatus } from "@/src/cms/working-drafts";

export function CmsDraftFeedback({ status }: { status: PersistenceStatus }) {
  if (status === "idle") return null;
  const message = status === "saving" ? "Saving on this device…"
    : status === "saved" ? "Saved on this device."
    : status === "restore-error" ? "Couldn’t restore the local draft. Showing the current saved values."
    : "Couldn’t save on this device. Keep this page open to retain your edits.";
  return <p role={status === "error" || status === "restore-error" ? "alert" : "status"} aria-label="Local draft status" className="my-4 text-sm text-muted">{message}</p>;
}
