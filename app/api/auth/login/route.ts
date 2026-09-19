import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const SESSION_SECRET = process.env.SESSION_SECRET || "fallback-secret-key";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Per-IP limit, plus a site-wide cap because client IPs come from a
// forwardable header and can't be fully trusted.
const LOGIN_LIMIT_PER_IP = { maxRequests: 10, windowMs: 15 * 60 * 1000 };
const LOGIN_LIMIT_GLOBAL = { maxRequests: 100, windowMs: 60 * 60 * 1000 };

function passwordMatches(candidate: string, expected: string): boolean {
  // Hash both so the comparison is constant-time regardless of length.
  const a = crypto.createHash("sha256").update(candidate).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

function createSessionToken(): string {
  const timestamp = Date.now().toString();
  const random = crypto.randomBytes(16).toString("hex");
  const data = `admin:${timestamp}:${random}`;
  const hmac = crypto.createHmac("sha256", SESSION_SECRET);
  hmac.update(data);
  const signature = hmac.digest("hex");
  return Buffer.from(`${data}:${signature}`).toString("base64");
}

export async function POST(request: NextRequest) {
  try {
    const perIp = checkRateLimit(`login:${getClientIp(request)}`, LOGIN_LIMIT_PER_IP);
    const global = checkRateLimit("login:all", LOGIN_LIMIT_GLOBAL);
    if (!perIp.allowed || !global.allowed) {
      const resetTime = Math.max(perIp.allowed ? 0 : perIp.resetTime, global.allowed ? 0 : global.resetTime);
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((resetTime - Date.now()) / 1000)) } }
      );
    }

    const body = await request.json();
    const { password } = body;

    if (!ADMIN_PASSWORD) {
      console.error("ADMIN_PASSWORD environment variable not set");
      return NextResponse.json(
        { error: "Admin login not configured" },
        { status: 500 }
      );
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    if (!passwordMatches(password, ADMIN_PASSWORD)) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    const token = createSessionToken();
    const response = NextResponse.json({ success: true });
    response.cookies.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
