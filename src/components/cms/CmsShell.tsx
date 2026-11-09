"use client";

import { Drawer } from "@heroui/react/drawer";
import { BookOpen, FolderKanban, Menu, PanelTop, UserRound, MessagesSquare, Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { CmsAppearanceControls } from "./CmsAppearanceControls";
import { Button } from "@/src/components/ui/Button";

const navigationItems = [
  { id: "hero", label: "Hero", path: "/admin/hero", Icon: PanelTop },
  { id: "projects", label: "Projects", path: "/admin/projects", Icon: FolderKanban },
  { id: "publications", label: "Publications", path: "/admin/publications", Icon: BookOpen },
  { id: "about", label: "About", path: "/admin/about", Icon: UserRound },
  { id: "contact", label: "Contact", path: "/admin/contact", Icon: MessagesSquare },
  { id: "seo", label: "SEO", path: "/admin/seo", Icon: Search },
] as const;

export const CmsPreviewVisibility = createContext<Dispatch<SetStateAction<boolean>> | null>(null);

export function CmsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const section = navigationItems.find(({ path }) => pathname === path || pathname.startsWith(`${path}/`))?.id;
  const [preview, setPreview] = useState(false);
  const router = useRouter();
  const navigate = (path: string) => router.push(path);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigation = (
    <nav aria-label="Content navigation" className="mt-10">
      <p className="mb-3 px-3 text-xs font-medium uppercase tracking-widest text-muted">
        Content
      </p>
      <div className="space-y-2">
        {navigationItems.map(({ id, label, Icon, path }) => (
          <Button key={id} className="w-full justify-start"
            variant={section === id ? "secondary" : "ghost"}
            aria-current={section === id ? "page" : undefined}
            startContent={Icon ? <Icon aria-hidden="true" className="size-4" /> : undefined}
            onPress={() => { setMenuOpen(false); navigate(path); }}>
            {label}
          </Button>
        ))}
      </div>
    </nav>
  );
  return (
    <CmsPreviewVisibility value={setPreview}>
    <div className={preview ? "min-h-dvh bg-surface text-foreground" : "min-h-dvh bg-background text-foreground lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]"}>
      {!preview && <a
        href="#cms-main"
        className="sr-only z-50 bg-surface p-4 focus:not-sr-only focus:fixed"
      >
        Skip to content
      </a>}
      {!preview && <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border bg-surface px-5 py-8 lg:flex">
        <p className="text-lg font-semibold tracking-tight">
          Content studio<span className="text-accent">.</span>
        </p>
        <p className="mt-1 text-sm text-muted">Your portfolio, in words.</p>
        {navigation}
        <div className="mt-auto border-t border-border pt-5 text-xs leading-5 text-muted">
          A space to shape your writing.
          <br />
          Preview it as your readers will see it.
        </div>
      </aside>}
      <div className="min-w-0">
        {!preview && <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="lg:hidden">
              <Drawer isOpen={menuOpen} onOpenChange={setMenuOpen}>
                <Button
                  aria-label="Open content navigation"
                  variant="ghost"
                  isIconOnly
                >
                  <Menu aria-hidden="true" className="size-5" />
                </Button>
                <Drawer.Backdrop>
                  <Drawer.Content placement="left">
                    <Drawer.Dialog aria-label="Content navigation">
                      <Drawer.Header>
                        <Drawer.Heading>Content studio</Drawer.Heading>
                        <Drawer.CloseTrigger aria-label="Close navigation" />
                      </Drawer.Header>
                      <Drawer.Body>{navigation}</Drawer.Body>
                    </Drawer.Dialog>
                  </Drawer.Content>
                </Drawer.Backdrop>
              </Drawer>
            </div>
          </div>
          <CmsAppearanceControls />
        </header>}
        <main
          id="cms-main"
          className={preview ? "min-h-dvh" : "mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12"}
        >
          {children}
        </main>
      </div>
    </div>
    </CmsPreviewVisibility>
  );
}
