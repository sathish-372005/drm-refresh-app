import "server-only";
import { InteractionRequiredAuthError } from "@azure/msal-node";
import { NextResponse } from "next/server";
import { AuthError } from "./entra-token";

export function json(body: unknown, status = 200, headers?: HeadersInit) {
  const h = new Headers(headers);
  h.set("Cache-Control", "no-store");
  return NextResponse.json(body, { status, headers: h });
}

export function handleError(error: unknown) {
  if (error instanceof AuthError) {
    return json({ code: "UNAUTHENTICATED", error: "Sign in required." }, 401);
  }

  if (error instanceof InteractionRequiredAuthError) {
    return json(
      {
        code: "INTERACTION_REQUIRED",
        error: "Microsoft needs your consent to access Power BI.",
      },
      403
    );
  }

  // Log the category only, never tokens.
  console.error("Request failed", {
    type: error instanceof Error ? error.name : "UnknownError",
    code: (error as { errorCode?: string })?.errorCode,
  });

  return json({ code: "SERVER_ERROR", error: "Something went wrong." }, 500);
}