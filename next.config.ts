import type { NextConfig } from "next";

function normalizeBasePath(v?: string | null) {
  const raw = String(v || "").trim();
  if (!raw || raw === "/") return "";
  const trimmed = raw.replace(/^\/+|\/+$/g, "");
  return trimmed ? `/${trimmed}` : "";
}

const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_APP_BASE_PATH || process.env.APP_BASE_PATH || "/maintenance");

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
};

export default nextConfig;
