import { requireAdminUserId } from "@/src/auth/owner-config";
import { CmsShell } from "@/src/components/cms/CmsShell";
import { SeoProvider } from "@/src/cms/SeoProvider";
import { SocialProvider } from "@/src/cms/SocialProvider";
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
          <SocialProvider>
            <SeoProvider>
              <CmsShell>{children}</CmsShell>
            </SeoProvider>
          </SocialProvider>
        </ProjectProvider>
      </CmsProvider>
    </CmsQueryProvider>
  );
}
