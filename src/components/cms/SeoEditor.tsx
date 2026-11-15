"use client";

import { Route, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { Form } from "@heroui/react";
import { useEffect, useId, useRef, useState } from "react";
import { useSeo } from "@/src/cms/SeoProvider";
import {
  emptySeoOverride,
  sameSeoRecord,
  sameSeoValues,
  validateSeoDefaults,
  validateSeoRecord,
  type SeoErrors,
  type SeoRecord,
  type SeoState,
  type SeoValues,
} from "@/src/cms/seo";
import { Button } from "@/src/components/ui/Button";
import { CmsDialog } from "./CmsDialog";
import { CmsField } from "./CmsField";
import { CmsLifecycleButton } from "./CmsLifecycleButton";
import {
  CmsEditorContent,
  CmsFeedback,
  CmsFieldSection,
  CmsFooter,
  CmsPageHeader,
} from "./CmsLayout";
import { CmsDraftFeedback } from "./CmsDraftFeedback";
import { ApiRequestError } from "@/src/api/client";
import {
  useDeleteSeoRecord,
  useSaveSeoRecord,
  useSeoQuery,
  useSeoRecordQuery,
} from "@/src/cms/seo-queries";
import { LoadingState } from "@/src/components/ui/LoadingState";
import { useWorkingDraft, type DraftStore } from "@/src/cms/working-drafts";
import { seoIssueFeedback } from "@/src/cms/seo-api";
import { useFirstFieldErrorFocus } from "./useFirstFieldErrorFocus";
import { SeoFields } from "./SeoFields";

export function SeoEditor({ id }: { id: string }) {
  const demo = useSeo();
  if (id === "new")
    return <SeoEditorForm key="new" defaultsMode={false} {...demo} />;
  return <ExistingSeoEditor id={id} working={demo.working} />;
}

function ExistingSeoEditor({
  id,
  working,
}: {
  id: string;
  working: DraftStore<SeoRecord>;
}) {
  const router = useRouter();
  const collection = useSeoQuery();
  const defaults = collection.data?.find((record) => record.path === "/");
  const item = useSeoRecordQuery(id === "defaults" ? defaults?.id : id);
  const mutation = useSaveSeoRecord(item.data?.id);
  const deletion = useDeleteSeoRecord(
    item.data?.path !== "/" ? item.data?.id : undefined,
  );
  const error =
    (!collection.data && collection.error) || (!item.data && item.error);
  if (error)
    return (
      <>
        <CmsPageHeader
          onBack={() => router.push("/admin/seo")}
          backLabel="Back to SEO"
          title="SEO override unavailable"
          description="Return to SEO to start again."
        />
        <CmsFeedback
          error={
            error instanceof ApiRequestError && error.status === 404
              ? "The saved SEO record is unavailable."
              : "Couldn’t load saved SEO content."
          }
        >
          {null}
        </CmsFeedback>
      </>
    );
  if (collection.data && !defaults)
    return (
      <CmsFeedback error="The saved SEO defaults are unavailable.">
        {null}
      </CmsFeedback>
    );
  if (!collection.data || !defaults || !item.data)
    return <LoadingState label="Loading SEO record" />;
  const record = item.data;
  const defaultValues = record.path === "/" ? record : defaults;
  const records = collection.data.filter(
    (entry) => entry.path !== "/" && entry.id !== record.id,
  );
  if (record.path !== "/") records.push(record);
  return (
    <SeoEditorForm
      key={record.id}
      defaultsMode={record.path === "/"}
      initialRecord={record}
      saved={{
        defaults: {
          title: defaultValues.title,
          description: defaultValues.description,
        },
        records,
      }}
      working={working}
      pending={mutation.pending || deletion.pending}
      deleteRecord={record.path !== "/" ? deletion.remove : undefined}
      saveRecord={mutation.save}
      saveDefaults={(value) => mutation.save({ ...value, path: "/" })}
    />
  );
}

export function SeoEditorForm({
  defaultsMode,
  initialRecord,
  saved,
  working,
  pending = false,
  saveDefaults,
  saveRecord,
  deleteRecord,
}: {
  defaultsMode: boolean;
  initialRecord?: SeoRecord;
  saved: SeoState;
  working: DraftStore<SeoRecord>;
  pending?: boolean;
  saveDefaults?: (value: SeoValues) => Promise<SeoRecord | void>;
  saveRecord?: (value: SeoRecord) => Promise<SeoRecord>;
  deleteRecord?: (id: string) => Promise<void>;
}) {
  const router = useRouter();
  const canSave = defaultsMode ? Boolean(saveDefaults) : Boolean(saveRecord);
  const { id, value, setValue, reset, ready, persistenceStatus } =
    useWorkingDraft(
      working,
      defaultsMode ? "defaults" : (initialRecord?.id ?? "new"),
      () =>
        defaultsMode
          ? { id: "defaults", path: "", ...saved.defaults }
          : (initialRecord ?? { id: "", path: "", ...emptySeoOverride() }),
      initialRecord?.id ?? (defaultsMode ? "defaults" : undefined),
    );
  const record = saved.records.find((item) => item.id === id);
  const baseline = defaultsMode
    ? { id, path: "", ...saved.defaults }
    : (record ?? { id, path: "", ...emptySeoOverride() });
  const dirty = defaultsMode
    ? !sameSeoValues(value, baseline)
    : !sameSeoRecord(value, baseline);
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const focusFirstError = useFirstFieldErrorFocus<keyof SeoErrors>(
    formRef,
    defaultsMode ? ["title", "description"] : ["path", "title", "description"],
  );
  const [serverErrors, setServerErrors] = useState<SeoErrors>({});
  const [exposed, setExposed] = useState<
    Partial<Record<keyof SeoErrors, boolean>>
  >({});
  const currentErrors = defaultsMode
    ? validateSeoDefaults(value)
    : validateSeoRecord({ ...value, id }, saved.records);
  const errors: SeoErrors = { ...serverErrors };
  for (const field of ["path", "title", "description"] as const) {
    if (exposed[field])
      errors[field] = serverErrors[field] ?? currentErrors[field];
  }
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState(false);

  function changeFields(patch: Partial<SeoRecord>) {
    if (pending) return;
    setError("");
    setServerErrors({});
    setMessage("");
    setValue((current) => ({ ...current, ...patch }));
  }
  function expose(field: keyof SeoErrors) {
    // Overrides share a single title-targeted completeness error.
    setExposed((current) => ({
      ...current,
      [field]: true,
      ...(!defaultsMode && field !== "path" ? { title: true } : {}),
    }));
  }
  async function saveChanges() {
    if (pending || !canSave) return false;
    setError("");
    setServerErrors({});
    setMessage("");
    const nextErrors = defaultsMode
      ? validateSeoDefaults(value)
      : validateSeoRecord({ ...value, id }, saved.records);
    setExposed(
      defaultsMode
        ? { title: true, description: true }
        : { path: true, title: true, description: true },
    );
    if (Object.keys(nextErrors).length) {
      focusFirstError(nextErrors);
      return false;
    }
    try {
      const canonical =
        defaultsMode && saveDefaults
          ? await saveDefaults(value)
          : await saveRecord?.({ ...value, id });
      if (!active.current) return true;
      if (canonical)
        setValue({
          ...canonical,
          id,
          path: defaultsMode ? "" : canonical.path,
        });
      setMessage("Saved.");
      return true;
    } catch (failure) {
      if (active.current) {
        if (failure instanceof ApiRequestError) {
          const feedback = seoIssueFeedback(failure.error?.issues);
          setServerErrors(feedback.fields);
          focusFirstError(feedback.fields);
          setError(
            failure.kind !== "server"
              ? "Couldn’t confirm the save."
              : [failure.message, ...feedback.general].join(" "),
          );
        } else
          setError(
            failure instanceof Error
              ? failure.message
              : "Save failed. Your changes are still here.",
          );
      }
      return false;
    }
  }
  async function remove() {
    if (pending || !record || !deleteRecord) return;
    setError("");
    try {
      await deleteRecord(id);
      if (!active.current) return;
      working.clear(id);
      router.push("/admin/seo");
    } catch (failure) {
      if (!active.current) return;
      setError(
        failure instanceof ApiRequestError && failure.kind !== "server"
          ? "Couldn’t confirm the deletion. Your changes are still here."
          : failure instanceof Error
            ? failure.message
            : "Delete failed. Your changes are still here.",
      );
    }
  }
  if (!ready) return <p role="status">Restoring local draft…</p>;
  return (
    <>
      <CmsPageHeader
        onBack={() => router.push("/admin/seo")}
        backLabel="Back to SEO"
        backDisabled={pending}
        title={
          defaultsMode
            ? "SEO defaults"
            : record
              ? "Edit SEO override"
              : "New SEO override"
        }
        description={
          defaultsMode
            ? "Used by paths without a title or description override."
            : "Override an exact site path. Adding an override does not create a public page."
        }
        action={
          <Button
            type="submit"
            form={formId}
            variant="outline"
            isDisabled={
              !canSave ||
              pending ||
              (!dirty && (defaultsMode || Boolean(record)))
            }
            startContent={<Save aria-hidden="true" className="size-4" />}
          >
            Save changes
          </Button>
        }
      />
      <CmsDraftFeedback status={persistenceStatus} />
      <CmsFeedback
        label="SEO save status"
        error={!deleting ? error : undefined}
      >
        {pending ? "Saving…" : dirty ? "Unsaved changes" : "No unsaved changes"}
        {message ? ` ${message}` : ""}
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
            <CmsFieldSection
              title="Content"
              description={
                defaultsMode
                  ? "Both defaults are required."
                  : "Provide at least one override. A blank individual field inherits its default."
              }
            >
              {!defaultsMode ? (
                <CmsField
                  name="path"
                  label="Path"
                  value={value.path}
                  error={errors.path}
                  icon={<Route aria-hidden="true" className="size-4" />}
                  hint="An exact site path such as /contact. Trailing slashes are normalized on save."
                  onBlur={() => expose("path")}
                  onChange={(path) => changeFields({ path })}
                />
              ) : null}
              <SeoFields
                value={value}
                defaults={defaultsMode ? undefined : saved.defaults}
                errors={errors}
                onBlur={expose}
                onChange={changeFields}
              />
            </CmsFieldSection>
          </CmsEditorContent>
        </fieldset>
      </Form>
      <CmsFooter
        actions={
          !defaultsMode && record && deleteRecord ? (
            <CmsLifecycleButton
              action="delete"
              disabled={pending}
              onPress={() => {
                setError("");
                setDeleting(true);
              }}
            >
              Delete override
            </CmsLifecycleButton>
          ) : undefined
        }
      >
        <Button
          type="button"
          variant="ghost"
          isDisabled={
            pending ||
            (!dirty && !Object.keys(exposed).length && !error && !message)
          }
          onPress={() => {
            reset(baseline);
            setExposed({});
            setServerErrors({});
            setError("");
            setMessage("");
          }}
        >
          Discard changes
        </Button>
      </CmsFooter>
      <CmsDialog
        open={deleting}
        onClose={() => {
          if (!pending) setDeleting(false);
        }}
        title="Delete this override?"
        error={error}
        actions={
          <>
            <Button
              type="button"
              variant="ghost"
              isDisabled={pending}
              onPress={() => setDeleting(false)}
            >
              Cancel
            </Button>
            <CmsLifecycleButton
              action="delete"
              confirmation
              pending={pending}
              onPress={() => void remove()}
            >
              Delete
            </CmsLifecycleButton>
          </>
        }
      >
        Remove the override for {record?.path}? This removes its saved values
        and current edits. Global defaults will apply. The public page is not
        deleted.
      </CmsDialog>
    </>
  );
}
