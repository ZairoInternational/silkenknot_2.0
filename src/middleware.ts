import { NextResponse, type NextRequest } from "next/server";
import {
  DOCS_COOKIE,
  docsAccessSecret,
  docsGateOpenWithoutAuth,
  isDocsHtmlPath,
  isProtectedDocsPath,
  verifyDocsCookieValue,
} from "@/lib/docs/access";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isProtectedDocsPath(pathname)) {
    if (docsGateOpenWithoutAuth()) {
      // public override or local without secret
    } else {
      const secret = docsAccessSecret();
      if (!secret) {
        return new NextResponse(null, { status: 404 });
      }
      const token = request.cookies.get(DOCS_COOKIE)?.value;
      const ok = await verifyDocsCookieValue(token, secret);
      if (!ok) {
        if (isDocsHtmlPath(pathname)) {
          const url = request.nextUrl.clone();
          url.pathname = "/docs/login";
          url.search = "";
          url.searchParams.set("next", pathname);
          return NextResponse.redirect(url);
        }
        return new NextResponse(null, { status: 404 });
      }
    }
  }

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
  matcher: [
    "/checkout/:path*",
    "/account/:path*",
    "/docs/api",
    "/docs/api/:path*",
    "/docs/api.html",
    "/docs/login",
    "/openapi.yaml",
    "/openapi.json",
    "/api/openapi",
  ],
};
