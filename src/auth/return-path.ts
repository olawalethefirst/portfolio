const fallback = "/admin";
const baseOrigin = "https://return-path.invalid";

/** Resolve once, then redirect to the validated path unchanged. */
export function adminReturnPath(value: string | null | undefined): string {
  if (!value) return fallback;

  try {
    const url = new URL(value, baseOrigin);
    const path = decodeURIComponent(url.pathname).replace(/[/\\]+/g, "/");
    const isAdmin = path === "/admin" || path.startsWith("/admin/");
    const isLogin = /^\/admin\/login(?:\/|$)/i.test(path);
    if (url.origin !== baseOrigin || !isAdmin || isLogin) return fallback;

    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
