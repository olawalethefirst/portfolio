"use client";
import dynamic from "next/dynamic";
import { Maximize2, Save } from "lucide-react";
import { Form, Spinner } from "@heroui/react";
import { useEffect, useId, useRef, useState } from "react";
import { useHeroQuery, useSaveHero } from "@/src/cms/hero-queries";
import {
  heroDraftSchema,
  sameHero,
  validateHero,
  type HeroDraft,
  type HeroErrors,
  type HeroField,
} from "@/src/cms/hero";
import { Button } from "@/src/components/ui/Button";
import { CmsDraftFeedback } from "./CmsDraftFeedback";
import {
  useDraftStore,
  useWorkingDraft,
  type DraftStore,
} from "@/src/cms/working-drafts";
import { heroIssueFeedback } from "@/src/cms/hero-api";
import { ApiRequestError } from "@/src/api/client";
import { CmsField } from "./CmsField";
import {
  CmsEditorContent,
  CmsFieldSection,
  CmsFeedback,
  CmsPageHeader,
  CmsToolbar,
  CmsFooter,
} from "./CmsLayout";
import { CmsPreviewFrame, useCmsPreview } from "./CmsPreviewFrame";
const HeroPreview = dynamic(
  () => import("./HeroPreview").then((m) => m.HeroPreview),
  { ssr: false, loading: () => <p role="status">Loading hero preview…</p> },
);
const stages = [
  ["idea", "Idea"],
  ["iterate", "Iterate"],
  ["solution", "Solution"],
] as const;
export function HeroEditor() {
  const { data: saved, error: loadError } = useHeroQuery();
  const working = useDraftStore<HeroDraft>({
    namespace: "hero",
    schema: heroDraftSchema,
  });
  if (!saved)
    return (
      <>
        <CmsPageHeader
          title="Hero"
          description="Edit the introduction and the copy shown for each fixed stage."
        />
        {loadError ? (
          <CmsFeedback error="Couldn’t load Hero content.">{null}</CmsFeedback>
        ) : (
          <p role="status" className="flex items-center gap-2"><Spinner size="sm" aria-hidden="true" />Loading saved Hero…</p>
        )}
      </>
    );
  return (
    <HeroEditorForm
      saved={saved}
      working={working}
      loadError={loadError}
    />
  );
}

function HeroEditorForm({
  saved,
  working,
  loadError,
}: {
  saved: HeroDraft;
  working: DraftStore<HeroDraft>;
  loadError: Error | null;
}) {
  const { save, pending, error: saveError, reset: resetSave } = useSaveHero();
  const { value, setValue, reset, ready, persistenceStatus } = useWorkingDraft(
    working,
    "hero",
    () => saved,
  );
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const [preview, setPreview] = useState(false);
  const { closeRef, capture } = useCmsPreview(preview, () => setPreview(false));
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [exposed, setExposed] = useState<Partial<Record<HeroField, boolean>>>(
    {},
  );
  const currentErrors = validateHero(value);
  const feedback = heroIssueFeedback(saveError instanceof ApiRequestError ? saveError.error?.issues : []);
  const saveMessage = saveError instanceof ApiRequestError && saveError.kind !== "server"
    ? "Couldn’t confirm the save."
    : saveError?.message;
  const error = saveError ? [saveMessage, ...feedback.general].join(" ")
    : loadError ? "Couldn’t load Hero content." : undefined;
  const errors: HeroErrors = { ...feedback.fields };
  for (const field of Object.keys(currentErrors) as HeroField[]) {
    if (exposed[field]) errors[field] = currentErrors[field];
  }
  const expose = (field: HeroField) =>
    setExposed((current) => ({ ...current, [field]: true }));
  function edit(next: (current: HeroDraft) => HeroDraft) {
    if (pending) return;
    resetSave();
    setValue(next);
  }
  const dirty = !sameHero(value, saved);
  function focusFirstError(nextErrors: HeroErrors) {
    const order: HeroField[] = [
      "eyebrow",
      "headline",
      ...stages.flatMap(
        ([key]) => [`${key}-tagline`, `${key}-description`] as const,
      ),
    ];
    const first = order.find((field) => nextErrors[field]);
    if (first)
      requestAnimationFrame(() => {
        if (active.current)
          formRef.current
            ?.querySelector<HTMLElement>(`[name="${first}"]`)
            ?.focus();
      });
  }
  async function saveChanges() {
    if (pending) return false;
    resetSave();
    const nextErrors = validateHero(value);
    setExposed(
      Object.fromEntries(Object.keys(nextErrors).map((field) => [field, true])),
    );
    if (Object.keys(nextErrors).length) {
      focusFirstError(nextErrors);
      return false;
    }
    try {
      const canonical = await save(value);
      if (active.current)
        reset(canonical);
      return true;
    } catch (failure) {
      if (active.current) {
        const feedback = heroIssueFeedback(
          failure instanceof ApiRequestError ? failure.error?.issues : [],
        );
        focusFirstError(feedback.fields);
      } else {
        resetSave();
      }
      return false;
    }
  }
  const update = (patch: Partial<HeroDraft>) =>
    edit((current) => ({ ...current, ...patch }));
  if (!ready) return <p role="status">Restoring local draft…</p>;
  if (preview)
    return (
      <CmsPreviewFrame
        label="Hero preview"
        exitLabel="Exit preview"
        closeRef={closeRef}
        onExit={() => setPreview(false)}
      >
        <HeroPreview value={value} />
      </CmsPreviewFrame>
    );
  return (
    <>
      <CmsPageHeader
        title="Hero"
        description="Edit the introduction and the copy shown for each fixed stage."
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
          isDisabled={pending}
          id="hero-preview-trigger"
          variant="outline"
          startContent={<Maximize2 aria-hidden="true" className="size-4" />}
          onPress={() => {
            capture("hero-preview-trigger");
            setPreview(true);
          }}
        >
          Preview
        </Button>
      </CmsToolbar>
      <CmsDraftFeedback status={persistenceStatus} />
      <CmsFeedback label="Hero save status" error={error}>
        {pending ? "Saving…" : dirty ? "Unsaved changes" : "No unsaved changes"}
      </CmsFeedback>
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
              name="eyebrow"
              onBlur={() => expose("eyebrow")}
              label="Eyebrow"
              error={errors.eyebrow}
              value={value.eyebrow}
              onChange={(eyebrow) => update({ eyebrow })}
            />
            <CmsField
              name="headline"
              onBlur={() => expose("headline")}
              label="Headline"
              error={errors.headline}
              value={value.headline}
              onChange={(headline) => update({ headline })}
            />
            <div className="mt-8 space-y-8">
              {stages.map(([key, label]) => (
                <CmsFieldSection key={key} title={label} level={3} separated>
                  <CmsField
                    name={key + "-tagline"}
                    onBlur={() => expose(`${key}-tagline`)}
                    label="Tagline"
                    error={errors[`${key}-tagline`]}
                    value={value.stages[key].tagline}
                    onChange={(tagline) =>
                      edit((current) => ({
                        ...current,
                        stages: {
                          ...current.stages,
                          [key]: { ...current.stages[key], tagline },
                        },
                      }))
                    }
                  />
                  <CmsField
                    name={key + "-description"}
                    onBlur={() => expose(`${key}-description`)}
                    label="Description"
                    error={errors[`${key}-description`]}
                    multiline="short"
                    value={value.stages[key].description}
                    onChange={(description) =>
                      edit((current) => ({
                        ...current,
                        stages: {
                          ...current.stages,
                          [key]: { ...current.stages[key], description },
                        },
                      }))
                    }
                  />
                </CmsFieldSection>
              ))}
            </div>
          </CmsFieldSection>
        </CmsEditorContent>
        </fieldset>
      </Form>
      <CmsFooter>
        <Button
          type="button"
          variant="ghost"
          isDisabled={pending || !dirty}
          onPress={() => {
                    reset(saved);
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
