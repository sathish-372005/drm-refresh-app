import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { verifyEntraToken, type Identity } from "./entra-token";
import { getPowerBiToken } from "./powerbi";

const POWER_BI = "https://api.powerbi.com/v1.0/myorg";
const CONSENT = /AADSTS65001|consent|interaction_required/i;

type Ctx = { pbToken: string; identity: Identity };
type PowerBiResult<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

const fail = (error: string, message: string, status: number) =>
  NextResponse.json({ error, message }, { status });

export const withPowerBi = async (req: NextRequest, handler: (ctx: Ctx) => Promise<NextResponse>) => {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return fail("unauthorized", "Sign in required.", 401);

  const identity = await verifyEntraToken(token).catch(() => null);
  if (!identity) return fail("unauthorized", "Sign in required.", 401);

  const pbToken = await getPowerBiToken(token, identity).catch((e: unknown) => e);
  if (typeof pbToken !== "string") {
    const consent = CONSENT.test(pbToken instanceof Error ? pbToken.message : "");
    return fail(
      consent ? "consent_required" : "powerbi_token_failed",
      consent ? "Admin consent is missing for Power BI (Tenant.Read.All)." : "Could not get a Power BI token.",
      403
    );
  }
  return handler({ pbToken, identity });
};

export const powerBiGet = async <T>(pbToken: string, path: string): Promise<PowerBiResult<T>> => {
  const res = await fetch(`${POWER_BI}${path}`, {
    headers: { Authorization: `Bearer ${pbToken}` },
    cache: "no-store",
  });
  if (res.ok) return { ok: true, data: (await res.json()) as T };

  const response =
    res.status === 401 || res.status === 403
      ? fail(
          "not_admin",
          "You are not an administrator. This app requires a Fabric / Power BI administrator account with Tenant.Read.All consented.",
          403
        )
      : res.status === 429
        ? fail("rate_limited", "Power BI limit reached. Try again later.", 429)
        : fail("powerbi_error", `Power BI returned ${res.status}.`, 502);
  return { ok: false, response };
};

