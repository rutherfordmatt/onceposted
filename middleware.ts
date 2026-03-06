import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /admin routes (but not /secret-admin which is the login page)
  if (pathname.startsWith("/admin")) {
    const sessionCookie = request.cookies.get("admin_session");

    // Simple check: if no session cookie, redirect to login
    // The actual session validation happens in the API routes
    if (!sessionCookie?.value) {
      const loginUrl = new URL("/secret-admin", request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Basic token format check (must be base64 and have expected structure)
    try {
      const decoded = Buffer.from(sessionCookie.value, "base64").toString("utf-8");
      const parts = decoded.split(":");
      
      if (parts.length !== 4 || parts[0] !== "admin") {
        const loginUrl = new URL("/secret-admin", request.url);
        return NextResponse.redirect(loginUrl);
      }

      // Check expiration (24 hours)
      const timestamp = parseInt(parts[1], 10);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000;
      
      if (isNaN(timestamp) || now - timestamp > maxAge) {
        const loginUrl = new URL("/secret-admin", request.url);
        return NextResponse.redirect(loginUrl);
      }
    } catch {
      const loginUrl = new URL("/secret-admin", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
