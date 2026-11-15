import { requireAdminUserId } from "@/src/auth/owner-config";
import { CmsShell } from "@/src/components/cms/CmsShell";
import { SeoProvider } from "@/src/cms/SeoProvider";
import { ProjectProvider } from "@/src/cms/ProjectProvider";
import { CmsProvider } from "@/src/cms/CmsProvider";
import type { ReactNode } from "react";
import { CmsQueryProvider } from "@/src/cms/CmsQueryProvider";

export default function StudioLayout({ children }: { children: ReactNode }) {
  // Proxy admits only this verified owner. This ID scopes storage/cache, not access.
  const accountId = requireAdminUserId();
  return (
    <CmsQueryProvider accountId={accountId}>
      <CmsProvider>
        <ProjectProvider>
          <SeoProvider>
            <CmsShell>{children}</CmsShell>
          </SeoProvider>
        </ProjectProvider>
      </CmsProvider>
    </CmsQueryProvider>
  );
}
