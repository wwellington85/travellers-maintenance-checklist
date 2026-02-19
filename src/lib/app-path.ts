function normalizeBasePath(v?: string | null) {
  const raw = String(v || "").trim();
  if (!raw || raw === "/") return "";
  const trimmed = raw.replace(/^\/+|\/+$/g, "");
  return trimmed ? `/${trimmed}` : "";
}

export const APP_BASE_PATH = normalizeBasePath(
  process.env.NEXT_PUBLIC_APP_BASE_PATH || process.env.APP_BASE_PATH || "/maintenance"
);

export function withBasePath(pathname: string) {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (!APP_BASE_PATH) return path;
  if (path === APP_BASE_PATH || path.startsWith(`${APP_BASE_PATH}/`)) return path;
  return `${APP_BASE_PATH}${path}`;
}

export function withoutBasePath(pathname: string) {
  if (!APP_BASE_PATH) return pathname || "/";
  if (pathname === APP_BASE_PATH) return "/";
  if (pathname.startsWith(`${APP_BASE_PATH}/`)) return pathname.slice(APP_BASE_PATH.length) || "/";
  return pathname || "/";
}
