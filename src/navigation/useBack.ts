"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

interface NavigationHistory {
  readonly canGoBack: boolean;
}

/**
 * Whether going back would stay on this site. The Navigation API only exposes
 * same-origin entries, so `canGoBack` is exact where it exists. Elsewhere the
 * safe fallback is a same-origin referrer, which errs toward the fallback
 * route rather than ever leaving the site.
 */
function hasInAppHistory() {
  const navigation = (window as Window & { navigation?: NavigationHistory })
    .navigation;
  if (navigation) return navigation.canGoBack;
  try {
    return (
      Boolean(document.referrer) &&
      new URL(document.referrer).origin === window.location.origin
    );
  } catch {
    return false;
  }
}

/**
 * Returns a back action: step back when the previous entry is a page of this
 * app, otherwise navigate to `fallbackHref` (the home page by default).
 */
export function useBack(fallbackHref = "/") {
  const router = useRouter();
  return useCallback(() => {
    if (hasInAppHistory()) router.back();
    else router.push(fallbackHref);
  }, [fallbackHref, router]);
}
