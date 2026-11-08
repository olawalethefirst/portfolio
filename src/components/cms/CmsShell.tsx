"use client";

import { Drawer } from "@heroui/react/drawer";
import { BookOpen, FolderKanban, Menu, Moon, PanelTop, Sun, UserRound, MessagesSquare, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { setGlobalMode, useActiveTheme } from "@/src/theme/active-theme";
import { Button } from "@/src/components/ui/Button";

const navigationItems = [
  { id: "hero", label: "Hero", path: "/admin/hero", Icon: PanelTop },
  { id: "projects", label: "Projects", path: "/admin/projects", Icon: FolderKanban },
  { id: "publications", label: "Publications", path: "/admin/publications", Icon: BookOpen },
  { id: "about", label: "About", path: "/admin/about", Icon: UserRound },
  { id: "contact", label: "Contact", path: "/admin/contact", Icon: MessagesSquare },
  { id: "seo", label: "SEO", path: "/admin/seo", Icon: Search },
] as const;

export function CmsShell({ children, onNavigate, section = "publications" }: {
  children: ReactNode;
  onNavigate?: (path: string) => void;
  section?: (typeof navigationItems)[number]["id"];
}) {
  const router = useRouter();
  const navigate = onNavigate ?? ((path: string) => router.push(path));
  const [menuOpen, setMenuOpen] = useState(false);
  const { mode } = useActiveTheme();
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
    <div className="min-h-dvh bg-background text-foreground lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <a
        href="#cms-main"
        className="sr-only z-50 bg-surface p-4 focus:not-sr-only focus:fixed"
      >
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border bg-surface px-5 py-8 lg:flex">
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
      </aside>
      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3 sm:px-8">
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
            <p className="text-xs leading-5 text-muted">
              <span className="mr-2 border border-border px-1.5 py-0.5 font-medium text-foreground">
                Demo
              </span>
              Changes reset on reload
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onPress={() => setGlobalMode(mode === "dark" ? "light" : "dark")}
            startContent={
              mode === "dark" ? (
                <Sun aria-hidden="true" className="size-4" />
              ) : (
                <Moon aria-hidden="true" className="size-4" />
              )
            }
          >
            {mode === "dark" ? "Light mode" : "Dark mode"}
          </Button>
        </header>
        <main
          id="cms-main"
          className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
