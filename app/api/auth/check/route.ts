import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

const SESSION_SECRET = process.env.SESSION_SECRET || "fallback-secret-key";

function verifySessionToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");
    
    if (parts.length !== 4) {
      return false;
    }

    const [role, timestamp, random, signature] = parts;
    
    if (role !== "admin") {
      return false;
    }

    // Check if session is expired (24 hours)
    const sessionTime = parseInt(timestamp, 10);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in ms
    
    if (now - sessionTime > maxAge) {
      return false;
    }

    // Verify signature
    const data = `${role}:${timestamp}:${random}`;
    const hmac = crypto.createHmac("sha256", SESSION_SECRET);
    hmac.update(data);
    const expectedSignature = hmac.digest("hex");

    return signature === expectedSignature;
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("admin_session");

    if (!sessionCookie?.value) {
      return NextResponse.json({ authenticated: false });
    }

    const isValid = verifySessionToken(sessionCookie.value);
    
    return NextResponse.json({ authenticated: isValid });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json({ authenticated: false });
  }
}
