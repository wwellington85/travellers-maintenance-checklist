import { ImageResponse } from "next/og";
import { PwaIcon } from "@/lib/pwa-icon";

export async function GET() {
  const size = 512;
  return new ImageResponse(<PwaIcon size={size} maskable />, {
    width: size,
    height: size,
  });
}
