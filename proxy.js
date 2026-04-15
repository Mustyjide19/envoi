import { auth } from "./auth";
import { NextResponse } from "next/server";

function sanitizeRelativeRedirectPath(input, fallback = "/dashboard") {
  if (typeof input !== "string") {
    return fallback;
  }

  const trimmed = input.trim();

  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }

  return trimmed;
}

export default auth((req) => {
  const isAuth = !!req.auth;
  const pathname = req.nextUrl.pathname;
  const isE2ETests = process.env.E2E_TESTS === "true";

  const isAuthPage =
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up");

  const isPublicPage =
    pathname === "/" || isAuthPage;

  if (isAuthPage && isAuth) {
    const callbackUrl = sanitizeRelativeRedirectPath(
      req.nextUrl.searchParams.get("callbackUrl"),
      "/dashboard"
    );
    return NextResponse.redirect(new URL(callbackUrl, req.url));
  }

  if (!isAuth && !isPublicPage) {
    if (isE2ETests && pathname.startsWith("/upload")) {
      return NextResponse.next();
    }

    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set(
      "callbackUrl",
      `${pathname}${req.nextUrl.search || ""}`
    );
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/upload/:path*",
    "/files/:path*",
    "/collections/:path*",
    "/notifications/:path*",
    "/file-preview/:path*",
    "/sign-in",
    "/sign-up",
  ],
};
