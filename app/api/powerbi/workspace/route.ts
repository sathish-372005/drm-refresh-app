import type { NextRequest } from "next/server";
import { config } from "@/app/lib/config";
import { AuthError, verifyEntraToken } from "@/app/lib/entra-token";
import { handleError, json } from "@/app/lib/http";
import { getPowerBiToken } from "@/app/lib/powerbi";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const match = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i);
    if (!match) throw new AuthError();

    const token = match[1];
    const identity = await verifyEntraToken(token);
    const powerBiToken = await getPowerBiToken(token, identity);

    const response = await fetch(`${config.powerBi.baseUrl}/groups`, {
      headers: { Authorization: `Bearer ${powerBiToken}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      return json(
        { code: "POWERBI_THROTTLED", error: "Power BI is limiting requests. Try again later." },
        429,
        retryAfter ? { "Retry-After": retryAfter } : undefined
      );
    }
    if (response.status === 401 || response.status === 403) {
      return json({ code: "POWERBI_ACCESS_DENIED", error: "Power BI denied access for your account." }, 403);
    }
    if (!response.ok) {
      return json({ code: "POWERBI_REQUEST_FAILED", error: "Unable to load Power BI workspaces." }, 502);
    }

    const data = await response.json();
    if (!Array.isArray(data.value)) throw new Error("Unexpected Power BI response");

    return json({
      workspaces: data.value.map((w: { id: string; name: string }) => ({ id: w.id, name: w.name })),
    });
  } catch (error) {
    return handleError(error);
  }
}