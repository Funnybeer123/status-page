import { NextResponse } from "next/server";
import { auth } from "@/auth";

const publicPaths = ["/", "/login", "/signup"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/api/health"
  ) {
    return NextResponse.next();
  }

  const isPublic = publicPaths.includes(pathname);
  if (!req.auth && !isPublic && !pathname.startsWith("/api/auth")) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    const login = new URL("/login", req.nextUrl.origin);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
