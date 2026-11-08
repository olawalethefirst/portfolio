"use client";

import { Drawer } from "@heroui/react/drawer";
import { BookOpen, FolderKanban, Menu, Moon, PanelTop, Sun, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { setGlobalMode, useActiveTheme } from "@/src/theme/active-theme";
import { Button } from "@/src/components/ui/Button";

export function CmsShell({
  children,
  onPublications,
  onProjects,
  onHero,
  onAbout,
  section = "publications",
}: {
  children: ReactNode;
  onPublications: () => void;
  onProjects?: () => void;
  onHero?: () => void;
  onAbout?: () => void;
  section?: "publications" | "projects" | "hero" | "about";
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const { mode } = useActiveTheme();
  const navigationItems = [
    { id: "hero", label: "Hero", Icon: PanelTop, onPress: () => {
      if (onHero) onHero(); else router.push("/admin/hero");
    } },
    { id: "projects", label: "Projects", Icon: FolderKanban, onPress: () => {
      if (onProjects) onProjects(); else router.push("/admin/projects");
    } },
    { id: "publications", label: "Publications", Icon: BookOpen, onPress: onPublications },
    { id: "about", label: "About", Icon: UserRound, onPress: () => {
      if (onAbout) onAbout(); else router.push("/admin/about");
    } },
  ];
  const navigation = (
    <nav aria-label="Content navigation" className="mt-10">
      <p className="mb-3 px-3 text-xs font-medium uppercase tracking-widest text-muted">
        Content
      </p>
      <div className="space-y-2">
        {navigationItems.map(({ id, label, Icon, onPress }) => (
          <Button key={id} className="w-full justify-start"
            variant={section === id ? "secondary" : "ghost"}
            aria-current={section === id ? "page" : undefined}
            startContent={Icon ? <Icon aria-hidden="true" className="size-4" /> : undefined}
            onPress={() => { setMenuOpen(false); onPress(); }}>
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
