import type { MetadataRoute } from "next";
import { APP_BASE_PATH, withBasePath } from "@/lib/app-path";

export default function manifest(): MetadataRoute.Manifest {
  const scope = APP_BASE_PATH || "/";

  return {
    name: "Travellers Maintenance",
    short_name: "Maintenance",
    description: "Night maintenance checklist and management dashboard.",
    start_url: withBasePath("/auth/login"),
    scope,
    display: "fullscreen",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: withBasePath("/favicon.ico"),
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
