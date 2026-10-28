import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

const handlers = toNextJsHandler(auth);

// Account administration is exposed only through our owner-only users endpoint.
function handle(request: Request) {
  if (new URL(request.url).pathname.startsWith("/api/auth/admin/")) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  return request.method === "GET" ? handlers.GET(request) : handlers.POST(request);
}

export { handle as GET, handle as POST };
