"use client";

import { Save } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/src/components/ui/Button";
import { CmsDialog } from "./CmsDialog";

// The editor owns validation, request feedback and saved values. A false result
// keeps the destination and dialog available for retry.
export function useCmsUnsavedChanges({
  dirty,
  pending,
  save,
  navigate,
}: {
  dirty: boolean;
  pending: boolean;
  save: () => Promise<boolean>;
  navigate: (path: string) => void;
}) {
  const [destination, setDestination] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const busy = pending || saving;

  useEffect(() => {
    if (!dirty) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function leave(path: string) {
    if (pending || savingRef.current) return;
    if (dirty) setDestination(path);
    else navigate(path);
  }

  function stay() {
    if (!pending && !savingRef.current) setDestination(null);
  }

  function discard() {
    if (pending || savingRef.current || destination === null) return;
    navigate(destination);
    setDestination(null);
  }

  async function saveAndLeave() {
    if (pending || savingRef.current || destination === null) return;
    savingRef.current = true;
    setSaving(true);
    try {
      if (await save()) {
        navigate(destination);
        setDestination(null);
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return {
    leave,
    dialog: {
      open: destination !== null,
      pending: busy,
      onStay: stay,
      onDiscard: discard,
      onSave: saveAndLeave,
    },
  };
}

export function CmsUnsavedChangesDialog({
  open,
  pending,
  onStay,
  onDiscard,
  onSave,
  error,
}: ReturnType<typeof useCmsUnsavedChanges>["dialog"] & { error?: string }) {
  return (
    <CmsDialog open={open} onClose={onStay} title="Keep your changes?" error={error} actions={<>
      <Button variant="ghost" isDisabled={pending} onPress={onStay}>Stay</Button>
      <Button variant="ghost" isDisabled={pending} onPress={onDiscard}>Discard</Button>
      <Button isDisabled={pending} isLoading={pending} startContent={<Save aria-hidden="true" className="size-4" />} onPress={() => void onSave()}>Save and leave</Button>
    </>}>
      You have unsaved changes. Save before leaving, or discard your current edits.
    </CmsDialog>
  );
}
