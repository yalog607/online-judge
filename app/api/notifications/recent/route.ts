import { verifySession } from "@/lib/dal";
import { listForUser } from "@/modules/notification/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RECENT_LIMIT = 8;

// Thông báo gần đây của chính người dùng, dùng cho hộp thông báo ở chuông trên header.
export async function GET() {
  const user = await verifySession();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { items } = await listForUser(user.userId, { limit: RECENT_LIMIT });
  return Response.json({ items });
}
