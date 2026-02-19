import { APP_BASE_PATH } from "@/lib/app-path";

export const DEFAULT_SITE_URL = "https://apps.tbresorts.com/maintenance";

function normalizeBasePath(pathname: string) {
  if (!pathname || pathname === "/") return "";
  return `/${pathname.replace(/^\/+|\/+$/g, "")}`;
}

export function getCanonicalSiteUrl(fallbackOrigin?: string) {
  const raw =
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    fallbackOrigin ||
    DEFAULT_SITE_URL;

  try {
    const url = new URL(raw);
    const basePath = normalizeBasePath(url.pathname) || APP_BASE_PATH;
    return `${url.origin}${basePath}`;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export function getAppUrl(pathname: string, fallbackOrigin?: string) {
  const base = getCanonicalSiteUrl(fallbackOrigin);
  const url = new URL(base);
  const basePath = normalizeBasePath(url.pathname);
  const routePath = `/${pathname.replace(/^\/+/, "")}`;
  return `${url.origin}${basePath}${routePath}`;
}
