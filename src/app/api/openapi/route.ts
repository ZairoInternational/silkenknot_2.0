import { NextResponse } from "next/server";

/** Spec lives at `public/openapi.yaml` (mirror of `docs/api/openapi.yaml`). */
export async function GET(request: Request) {
  return NextResponse.redirect(new URL("/openapi.yaml", request.url), 307);
}
