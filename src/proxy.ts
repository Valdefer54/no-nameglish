import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/login" || path.startsWith("/api/auth/")) {
    return NextResponse.next();
  }
  // This only handles navigation; actions and APIs validate the actual session.
  if (getSessionCookie(request)) return NextResponse.next();
  if (path.startsWith("/api/")) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
