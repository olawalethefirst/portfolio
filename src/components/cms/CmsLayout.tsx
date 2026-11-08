"use client";

import { Accordion } from "@heroui/react/accordion";
import { Chip } from "@/src/components/ui/Chip";
import Link from "next/link";
import { useId, type ReactNode } from "react";

export function CmsPageHeader({ title, description, status, action }: { title: string; description: string; status?: ReactNode; action?: ReactNode }) {
  return <header className="mb-8 flex flex-wrap items-start justify-between gap-5">
    <div className="min-w-0">
      {status ? <p className="mb-2 text-xs uppercase tracking-widest text-muted">{status}</p> : null}
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted">{description}</p>
    </div>
    {action}
  </header>;
}

export function CmsToolbar({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return <div className="flex min-w-0 flex-wrap items-end justify-between gap-4 border-y border-border py-5">
    <div className="flex min-w-0 max-w-full flex-wrap gap-2">{children}</div>
    {actions ? <div className="flex min-w-0 max-w-full flex-wrap items-end gap-2">{actions}</div> : null}
  </div>;
}

export function CmsFeedback({ children, label, error }: { children: ReactNode; label?: string; error?: string }) {
  return <div className="my-6 space-y-3 text-sm text-muted">
    <div role="status" aria-label={label} className="min-h-6">{children}</div>
    {error ? <p role="alert" className="border border-danger/30 bg-danger/5 p-4 text-danger">{error}</p> : null}
  </div>;
}

export function CmsFooter({ children, actions }: { children?: ReactNode; actions?: ReactNode }) {
  if (!children && !actions) return null;
  return <footer className="mt-10 flex flex-wrap items-start justify-between gap-4 border-t border-border pt-5">
    {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
  </footer>;
}

export function CmsDemoControls({ children }: { children: ReactNode }) {
  return <Accordion className="mt-6" hideSeparator>
    <Accordion.Item id="demo-controls">
      <Accordion.Heading>
        <Accordion.Trigger className="text-sm">Demo controls<Accordion.Indicator /></Accordion.Trigger>
      </Accordion.Heading>
      <Accordion.Panel><Accordion.Body className="text-xs text-muted">{children}</Accordion.Body></Accordion.Panel>
    </Accordion.Item>
  </Accordion>;
}

export function CmsRecordRow({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return <li className="min-w-0 py-6">
    {children}
    {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
  </li>;
}

export function CmsRecordLink({ href, title, summary, metadata, status, thumbnail }: { href: string; title: string; summary: string; metadata: ReactNode; status: string; thumbnail?: ReactNode }) {
  return <Link href={href} className="group flex min-w-0 flex-wrap items-start gap-5 focus-visible:outline-2 focus-visible:outline-focus">
    {thumbnail}
    <div className="min-w-0 flex-1 basis-48">
      <h2 className="text-lg font-semibold tracking-tight [overflow-wrap:anywhere] group-hover:text-accent">{title}</h2>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted [overflow-wrap:anywhere]">{summary}</p>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">{metadata}</div>
    </div>
    <Chip size="sm" className="h-auto max-w-full whitespace-normal">{status}</Chip>
  </Link>;
}

export function CmsEditorContent({ children, supporting }: { children: ReactNode; supporting?: ReactNode }) {
  if (!supporting) return <div className="max-w-3xl space-y-8">{children}</div>;
  return <div className="grid min-w-0 gap-10 xl:grid-cols-[minmax(0,1fr)_18rem]">
    <div className="min-w-0 space-y-8">{children}</div>
    <aside className="min-w-0 space-y-8 border-t border-border pt-6 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-6">{supporting}</aside>
  </div>;
}

export function CmsFieldSection({ title, description, level = 2, separated = false, children }: { title: string; description?: string; level?: 2 | 3; separated?: boolean; children: ReactNode }) {
  const headingId = useId();
  const Heading = level === 3 ? "h3" : "h2";
  return <section aria-labelledby={headingId} className={`min-w-0 space-y-6${separated ? " border-t border-border pt-6" : ""}`}>
    <div>
      <Heading id={headingId} className="text-lg font-semibold">{title}</Heading>
      {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
    </div>
    {children}
  </section>;
}

export function CmsEmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="border border-dashed border-border px-5 py-16 text-center">
    <h2 className="text-lg font-medium">{title}</h2>
    <p className="mt-2 text-sm text-muted">{description}</p>
    {action ? <div className="mt-4">{action}</div> : null}
  </div>;
}
