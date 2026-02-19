export const DEFAULT_SITE_URL = "https://maintenance.tbresorts.com";

export function getCanonicalSiteUrl(fallbackOrigin?: string) {
  const raw =
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    fallbackOrigin ||
    DEFAULT_SITE_URL;

  try {
    return new URL(raw).origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}
