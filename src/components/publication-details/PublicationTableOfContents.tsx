"use client";

import { Link } from "@heroui/react/link";
import { Drawer } from "@heroui/react/drawer";
import { ListTree } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/src/components/ui/Button";
import type { PublicationHeading } from "./publication-headings";
import { useActivePublicationHeading } from "./useActivePublicationHeading";

function ContentsLinks({ headings, activeId, onNavigate }: { headings: readonly PublicationHeading[]; activeId: string | null; onNavigate?: () => void }) {
  const groups: { heading: PublicationHeading; children: PublicationHeading[] }[] = [];
  for (const heading of headings) {
    const previous = groups[groups.length - 1];
    if (heading.level === 3 && previous?.heading.level === 2) previous.children.push(heading);
    else groups.push({ heading, children: [] });
  }

  function headingLink(heading: PublicationHeading) {
    return (
      <Link aria-current={activeId === heading.id ? "location" : undefined} onPress={onNavigate} href={`#${heading.id}`} className={`block py-1.5 text-sm leading-6 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none ${activeId === heading.id ? "font-semibold text-accent" : "text-muted"}`}>
        {heading.label}
      </Link>
    );
  }

  return (
      <ul>
        {groups.map(({ heading, children }) => (
          <li key={heading.id}>
            {headingLink(heading)}
            {children.length ? <ul className="ml-4">{children.map((child) => <li key={child.id}>{headingLink(child)}</li>)}</ul> : null}
          </li>
        ))}
      </ul>

  );
}

export function PublicationTableOfContents({ headings }: { headings: readonly PublicationHeading[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const activeId = useActivePublicationHeading(headings);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    function closeOnDesktop() { if (desktop.matches) setIsOpen(false); }
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  if (!headings.length) return null;
  return (
    <>
      <div className="lg:hidden flex justify-end sticky top-8">
        <Drawer isOpen={isOpen} onOpenChange={setIsOpen}>
          <Button variant="ghost" size="sm" startContent={<ListTree aria-hidden="true" className="size-4" />}>Contents</Button>
          <Drawer.Backdrop variant="transparent">
            <Drawer.Content placement="bottom" className="">
              <Drawer.Dialog aria-label="Article sections">
                <Drawer.Header className="flex justify-end">
                  <Drawer.CloseTrigger aria-label="Close contents" />
                </Drawer.Header>
                <Drawer.Body>
                  <nav aria-label="Article sections" className="border-l border-border pl-5">
                    <ContentsLinks headings={headings} activeId={activeId} onNavigate={() => setIsOpen(false)} />
                  </nav>
                </Drawer.Body>
              </Drawer.Dialog>
            </Drawer.Content>
          </Drawer.Backdrop>
        </Drawer>
      </div>
      <nav aria-label="Article sections" tabIndex={0} className="hidden min-w-0 border-l border-border pl-5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus lg:sticky lg:top-8 lg:col-start-2 lg:row-start-1 lg:block lg:max-h-[calc(100svh-9rem)] lg:self-start lg:overflow-y-auto lg:pr-2">
        <ContentsLinks headings={headings} activeId={activeId} />
      </nav>
    </>
  );
}
