"use client";

import { Maximize2, Save } from "lucide-react";
import dynamic from "next/dynamic";
import { Form, Spinner } from "@heroui/react";
import { useEffect, useId, useRef, useState } from "react";
import { useAboutQuery, useSaveAbout } from "@/src/cms/about-queries";
import {
  aboutDraftSchema,
  sameAbout,
  validateAbout,
  type AboutDraft,
  type AboutErrors,
} from "@/src/cms/about";
import { aboutIssueFeedback } from "@/src/cms/about-api";
import { ApiRequestError } from "@/src/api/client";
import {
  useDraftStore,
  useReconciledDraft,
  type DraftStore,
} from "@/src/cms/working-drafts";
import { Button } from "@/src/components/ui/Button";
import { CmsField } from "./CmsField";
import {
  CmsEditorContent,
  CmsFeedback,
  CmsFieldSection,
  CmsFooter,
  CmsPageHeader,
  CmsToolbar,
} from "./CmsLayout";
import { CmsPreviewFrame, useCmsPreview } from "./CmsPreviewFrame";
import { CmsDraftFeedback } from "./CmsDraftFeedback";
import { useFirstFieldErrorFocus } from "./useFirstFieldErrorFocus";

const AboutPreview = dynamic(
  () => import("./AboutPreview").then((module) => module.AboutPreview),
  {
    ssr: false,
    loading: () => <p role="status">Loading About preview…</p>,
  },
);

export function AboutEditor() {
  const { data: saved, error: loadError } = useAboutQuery();
  const working = useDraftStore({
    namespace: "about",
    schema: aboutDraftSchema,
  });
  if (!saved)
    return (
      <>
        <CmsPageHeader
          title="About"
          description="Edit your introduction and biography. The conversation CTA stays fixed."
        />
        {loadError ? (
          <CmsFeedback error="Couldn’t load About content.">{null}</CmsFeedback>
        ) : (
          <p role="status" className="flex items-center gap-2">
            <Spinner size="sm" aria-hidden="true" />
            Loading saved About…
          </p>
        )}
      </>
    );
  return (
    <AboutEditorForm saved={saved} working={working} loadError={loadError} />
  );
}

function AboutEditorForm({
  saved,
  working,
  loadError,
}: {
  saved: AboutDraft;
  working: DraftStore<AboutDraft>;
  loadError: Error | null;
}) {
  const { save, pending, error: saveError, reset: resetSave } = useSaveAbout();
  const { value, draft, reset, bindField, ready, persistenceStatus } =
    useReconciledDraft(working, "about", saved, {
      disabled: pending,
      onChange: resetSave,
    });
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [exposed, setExposed] = useState<
    Partial<Record<keyof AboutDraft, boolean>>
  >({});
  const currentErrors = validateAbout(value);
  const feedback = aboutIssueFeedback(
    saveError instanceof ApiRequestError ? saveError.error?.issues : [],
  );
  const errors: AboutErrors = { ...feedback.fields };
  for (const field of ["heading", "biography"] as const) {
    if (exposed[field] && currentErrors[field])
      errors[field] = currentErrors[field];
  }
  const saveMessage =
    saveError instanceof ApiRequestError && saveError.kind !== "server"
      ? "Couldn’t confirm the save."
      : saveError?.message;
  const error = saveError
    ? [saveMessage, ...feedback.general].join(" ")
    : loadError
      ? "Couldn’t load About content."
      : undefined;
  const [preview, setPreview] = useState(false);
  const { closeRef, capture } = useCmsPreview(preview, () => setPreview(false));
  const dirty = !sameAbout(value, saved);
  const hasDraft = Boolean(draft && !sameAbout(draft, saved));

  const focusFirstError = useFirstFieldErrorFocus(formRef, ["heading", "biography"] as const);
  async function saveChanges() {
    if (pending) return false;
    resetSave();
    const nextErrors = validateAbout(value);
    setExposed({ heading: true, biography: true });
    if (Object.values(nextErrors).some(Boolean)) {
      focusFirstError(nextErrors);
      return false;
    }
    try {
      await save(value);
      if (active.current) reset();
      else if (working.drafts.about)
        working.clear("about", working.drafts.about);
      return true;
    } catch (failure) {
      if (active.current) {
        const feedback = aboutIssueFeedback(
          failure instanceof ApiRequestError ? failure.error?.issues : [],
        );
        focusFirstError(feedback.fields);
      } else resetSave();
      return false;
    }
  }

  if (!ready) return <p role="status">Restoring local draft…</p>;
  if (preview)
    return (
      <CmsPreviewFrame
        label="About preview"
        exitLabel="Exit preview"
        closeRef={closeRef}
        onExit={() => setPreview(false)}
      >
        <AboutPreview value={value} />
      </CmsPreviewFrame>
    );
  return (
    <>
      <CmsPageHeader
        title="About"
        description="Edit your introduction and biography. The conversation CTA stays fixed."
      />
      <CmsToolbar
        actions={
          <Button
            type="submit"
            form={formId}
            variant="outline"
            isDisabled={pending || !dirty}
            isLoading={pending}
            startContent={<Save aria-hidden="true" className="size-4" />}
          >
            Save changes
          </Button>
        }
      >
        <Button
          type="button"
          id="about-preview-trigger"
          variant="outline"
          isDisabled={pending}
          startContent={<Maximize2 aria-hidden="true" className="size-4" />}
          onPress={() => {
            capture("about-preview-trigger");
            setPreview(true);
          }}
        >
          Preview
        </Button>
      </CmsToolbar>
      <CmsDraftFeedback status={persistenceStatus} />
      <CmsFeedback label="About save status" error={error}>
        {pending ? "Saving…" : dirty ? "Unsaved changes" : "No unsaved changes"}
      </CmsFeedback>
      {hasDraft ? (
        <p role="status" className="my-4 text-sm text-muted">
          You have local changes. Review them beside each field.
        </p>
      ) : null}
      <Form
        id={formId}
        ref={formRef}
        className="block"
        validationBehavior="aria"
        onSubmit={(event) => {
          event.preventDefault();
          void saveChanges();
        }}
      >
        <fieldset disabled={pending} aria-busy={pending} className="min-w-0">
          <CmsEditorContent>
            <CmsFieldSection title="Content">
              <CmsField
                name="heading"
                label="Heading"
                error={errors.heading}
                onBlur={() =>
                  setExposed((current) => ({ ...current, heading: true }))
                }
                {...bindField(
                  (content) => content.heading,
                  (content, heading) => ({ ...content, heading }),
                )}
              />
              <CmsField
                name="biography"
                label="Biography"
                multiline="short"
                error={errors.biography}
                onBlur={() =>
                  setExposed((current) => ({ ...current, biography: true }))
                }
                {...bindField(
                  (content) => content.biography,
                  (content, biography) => ({ ...content, biography }),
                )}
              />
            </CmsFieldSection>
          </CmsEditorContent>
        </fieldset>
      </Form>
      <CmsFooter>
        <Button
          type="button"
          variant="ghost"
          isDisabled={pending || (!dirty && !hasDraft)}
          onPress={() => {
            reset();
            resetSave();
            setExposed({});
          }}
        >
          Discard changes
        </Button>
      </CmsFooter>
    </>
  );
}
