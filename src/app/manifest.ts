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
    display_override: ["fullscreen", "standalone"],
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: withBasePath("/icons/icon-192"),
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: withBasePath("/icons/icon-512"),
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: withBasePath("/icons/icon-192-maskable"),
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: withBasePath("/icons/icon-512-maskable"),
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
