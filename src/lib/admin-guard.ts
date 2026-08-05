/**
 * Admin API guard — returns a 404 response when
 * NEXT_PUBLIC_HIDE_ADMIN is "true" so that user-facing
 * deployments expose zero admin endpoints.
 */

import { NextResponse } from "next/server";

const HIDE_ADMIN = process.env.NEXT_PUBLIC_HIDE_ADMIN === "true";

export function adminGuard() {
  if (HIDE_ADMIN) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }
  return null;
}
