import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, sha256Hex, timingSafeEqual } from "./lib/adminCrypto.js";

export async function middleware(request) {
  if (request.nextUrl.pathname === "/admin/login") {
    return NextResponse.next();
  }

  const password = process.env.ADMIN_PASSWORD;
  const cookieValue = request.cookies.get(ADMIN_COOKIE_NAME)?.value;

  if (password && cookieValue) {
    const expected = await sha256Hex(password);
    if (timingSafeEqual(cookieValue, expected)) {
      return NextResponse.next();
    }
  }

  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = {
  matcher: ["/admin/:path*"],
};
