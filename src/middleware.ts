import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/account/login") return NextResponse.next();
  if (pathname === "/account/register" || pathname === "/account/forgot-password") {
    const url = request.nextUrl.clone();
    url.pathname = "/account/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  const guarded = pathname.startsWith("/checkout") || pathname.startsWith("/account");
  if (!guarded || request.cookies.get("silkknot_session")) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = "/account/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/checkout/:path*", "/account/:path*"],
};
