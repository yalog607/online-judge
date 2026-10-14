import { verifySession } from "@/lib/dal";
import { unreadCountFor } from "@/modules/notification/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await verifySession();
  if (!user) return new Response("Unauthorized", { status: 401 });
  return Response.json({ unread: await unreadCountFor(user.userId) });
}
