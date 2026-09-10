import { NextRequest, NextResponse } from "next/server";

/** Mock UI — all routes are open; onboarding cookie is optional. */
export async function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*|auth).*)"],
};
