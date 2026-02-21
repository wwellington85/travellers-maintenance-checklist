import { ImageResponse } from "next/og";
import { PwaIcon } from "@/lib/pwa-icon";

export async function GET() {
  const size = 192;
  return new ImageResponse(<PwaIcon size={size} />, {
    width: size,
    height: size,
  });
}
