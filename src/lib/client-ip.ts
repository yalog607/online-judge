import "server-only";
import { headers } from "next/headers";

/** Best-effort client IP behind a reverse proxy; "unknown" when no header is present. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip")?.trim() || "unknown";
}
