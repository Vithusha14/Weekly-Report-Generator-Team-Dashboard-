import { auth } from "@/lib/auth";
import { isManagerOrAdmin, isAdmin } from "@/lib/rbac";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  const publicPaths = ["/login", "/register"];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

  if (!isLoggedIn && !isPublic && !pathname.startsWith("/api/auth")) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (isLoggedIn && isPublic) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/team")) {
    if (!isManagerOrAdmin(role)) {
      return NextResponse.redirect(new URL("/reports", req.nextUrl.origin));
    }
  }

  if (pathname.startsWith("/users") && !isAdmin(role)) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  if (pathname.startsWith("/projects") && !isManagerOrAdmin(role)) {
    return NextResponse.redirect(new URL("/reports", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
