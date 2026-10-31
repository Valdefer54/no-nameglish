import { getCurrentUser } from "@/lib/current-user";
import { completeSessionAction, createSessionAction, getDueCardsAction } from "@/actions/session";

async function checkRequest(request: Request) {
  if (!await getCurrentUser()) return Response.json({ error: "Authentication required" }, { status: 401 });
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return Response.json({ error: "Invalid request origin" }, { status: 403 });
  }
  return null;
}

export async function POST(request: Request) {
  const denied = await checkRequest(request);
  if (denied) return denied;
  const body = await request.json().catch(() => null);
  if (typeof body?.requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.requestId)) {
    return Response.json({ error: "Invalid session request" }, { status: 400 });
  }
  try {
    const cards = await getDueCardsAction();
    if (cards.length === 0) return Response.json({ sessionId: null, cards });
    const { sessionId } = await createSessionAction(body.requestId);
    return Response.json({ sessionId, cards });
  } catch {
    return Response.json({ error: "Could not load the study session" }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const denied = await checkRequest(request);
  if (denied) return denied;
  const body = await request.json().catch(() => null);
  if (!Number.isSafeInteger(body?.sessionId) || !Array.isArray(body?.worstCardIds) || body.worstCardIds.length > 3 || !body.worstCardIds.every(Number.isSafeInteger)) {
    return Response.json({ error: "Invalid session summary" }, { status: 400 });
  }
  try {
    await completeSessionAction(body.sessionId, body.worstCardIds);
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Could not finish the study session" }, { status: 503 });
  }
}
