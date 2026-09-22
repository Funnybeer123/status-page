import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = new Set(["/", "/login", "/signup"]);

function hasSession(req: NextRequest) {
  return Boolean(
    req.cookies.get("authjs.session-token") ||
      req.cookies.get("__Secure-authjs.session-token") ||
      req.cookies.get("next-auth.session-token") ||
      req.cookies.get("__Secure-next-auth.session-token"),
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/api/health" ||
    pathname === "/api/signup" ||
    pathname.startsWith("/s/") ||
    pathname.startsWith("/api/media") ||
    (pathname.startsWith("/api/cal/") && pathname !== "/api/cal/token") ||
    pathname.startsWith("/icon")
  ) {
    return NextResponse.next();
  }

  if (hasSession(req) || publicPaths.has(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const login = new URL("/login", req.nextUrl.origin);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
