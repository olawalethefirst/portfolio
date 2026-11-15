"use client";

import { Link, Maximize2, Save } from "lucide-react";
import dynamic from "next/dynamic";
import { SOCIAL_PROFILES } from "@/src/components/contact-conversation/social-profiles";
import { Form, Spinner } from "@heroui/react";
import { useEffect, useId, useRef, useState } from "react";
import { useSocialQuery, useSaveSocial } from "@/src/cms/social-queries";
import {
  socialDraftSchema,
  sameSocial,
  validateSocial,
  type SocialDraft,
  type SocialErrors,
} from "@/src/cms/social";
import { socialIssueFeedback } from "@/src/cms/social-api";
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

const ContactPreview = dynamic(
  () => import("./ContactPreview").then((module) => module.ContactPreview),
  {
    ssr: false,
    loading: () => <p role="status">Loading social profiles preview…</p>,
  },
);

export function ContactEditor() {
  const { data: saved, error: loadError } = useSocialQuery();
  const working = useDraftStore({
    namespace: "social",
    schema: socialDraftSchema,
  });
  if (!saved)
    return (
      <>
        <CmsPageHeader
          title="Contact"
          description="Edit your GitHub, LinkedIn and X destinations. Profile labels and icons stay fixed."
        />
        {loadError ? (
          <CmsFeedback error="Couldn’t load social profiles.">
            {null}
          </CmsFeedback>
        ) : (
          <p role="status" className="flex items-center gap-2">
            <Spinner size="sm" aria-hidden="true" />
            Loading saved social profiles…
          </p>
        )}
      </>
    );
  return (
    <ContactEditorForm saved={saved} working={working} loadError={loadError} />
  );
}

function ContactEditorForm({
  saved,
  working,
  loadError,
}: {
  saved: SocialDraft;
  working: DraftStore<SocialDraft>;
  loadError: Error | null;
}) {
  const { save, pending, error: saveError, reset: resetSave } = useSaveSocial();
  const { value, draft, reset, bindField, ready, persistenceStatus } =
    useReconciledDraft(working, "contact", saved, {
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
    Partial<Record<keyof SocialDraft, boolean>>
  >({});
  const currentErrors = validateSocial(value);
  const feedback = socialIssueFeedback(
    saveError instanceof ApiRequestError ? saveError.error?.issues : [],
  );
  const errors: SocialErrors = { ...feedback.fields };
  for (const { id: field } of SOCIAL_PROFILES) {
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
      ? "Couldn’t load social profiles."
      : undefined;
  const [preview, setPreview] = useState(false);
  const { closeRef, capture } = useCmsPreview(preview, () => setPreview(false));
  const dirty = !sameSocial(value, saved);
  const hasDraft = Boolean(draft && !sameSocial(draft, saved));

  const focusFirstError = useFirstFieldErrorFocus(formRef, SOCIAL_PROFILES.map(({ id }) => id));
  async function saveChanges() {
    if (pending) return false;
    resetSave();
    const nextErrors = validateSocial(value);
    setExposed({ github: true, linkedin: true, x: true });
    if (Object.values(nextErrors).some(Boolean)) {
      focusFirstError(nextErrors);
      return false;
    }
    try {
      await save(value);
      if (active.current) reset();
      else if (working.drafts.contact)
        working.clear("contact", working.drafts.contact);
      return true;
    } catch (failure) {
      if (active.current) {
        const feedback = socialIssueFeedback(
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
        label="Contact preview"
        exitLabel="Exit preview"
        closeRef={closeRef}
        onExit={() => setPreview(false)}
      >
        <ContactPreview value={value} />
      </CmsPreviewFrame>
    );
  return (
    <>
      <CmsPageHeader
        title="Contact"
        description="Edit your GitHub, LinkedIn and X destinations. Profile labels and icons stay fixed."
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
          id="social-preview-trigger"
          variant="outline"
          isDisabled={pending}
          startContent={<Maximize2 aria-hidden="true" className="size-4" />}
          onPress={() => {
            capture("social-preview-trigger");
            setPreview(true);
          }}
        >
          Preview contact
        </Button>
      </CmsToolbar>
      <CmsDraftFeedback status={persistenceStatus} />
      <CmsFeedback label="Contact save status" error={error}>
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
              {SOCIAL_PROFILES.map(({ id, label }) => (
                <CmsField
                  key={id}
                  name={id}
                  label={`${label} URL`}
                  type="url"
                  icon={<Link aria-hidden="true" className="size-4" />}
                  hint="Enter a complete HTTPS profile URL."
                  error={errors[id]}
                  onBlur={() =>
                    setExposed((current) => ({ ...current, [id]: true }))
                  }
                  {...bindField(
                    (content) => content[id],
                    (content, url) => ({ ...content, [id]: url }),
                  )}
                />
              ))}
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
