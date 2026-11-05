import { verifyEntraToken } from "@/app/lib/entra-token";
import { getPowerBiToken } from "@/app/lib/powerbi";
import { NextRequest, NextResponse } from "next/server";


const MAX_TOP = 5000;

type AdminGroup = {
  id: string;
  name: string;
  capacityId?: string;
  datasets?: { id: string; name: string; configuredBy?: string; isRefreshable?: boolean }[];
};

export async function GET(req: NextRequest) {
  // 1. Verify the caller (copy these lines from your datasets route)
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let identity;
  try {
    identity = await verifyEntraToken(token); 
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2. Power BI token (on-behalf-of). Your helper returns a string and throws on failure.
  let pbToken: string;
  try {
    pbToken = await getPowerBiToken(token, identity);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    const consent = /AADSTS65001|consent|interaction_required/i.test(msg);
    return NextResponse.json(
      {
        error: consent ? "consent_required" : "powerbi_token_failed",
        message: consent
          ? "Admin consent is missing for Power BI (Tenant.Read.All)."
          : "Could not get a Power BI token.",
      },
      { status: 403 }
    );
  }

  // 3. Paging: ?top=200&skip=0
  const sp = req.nextUrl.searchParams;
  const top = Math.min(Math.max(Number(sp.get("top")) || 200, 1), MAX_TOP);
  const skip = Math.max(Number(sp.get("skip")) || 0, 0);
  const filter = encodeURIComponent("type eq 'Workspace' and state eq 'Active'");

  const res = await fetch(
    `https://api.powerbi.com/v1.0/myorg/admin/groups?$top=${top}&$skip=${skip}&$expand=datasets&$filter=${filter}`,
    { headers: { Authorization: `Bearer ${pbToken}` }, cache: "no-store" }
  );

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      return NextResponse.json(
        {
          error: "not_admin",
          message: "This app needs a Fabric / Power BI administrator account with Tenant.Read.All consented.",
        },
        { status: 403 }
      );
    }
    if (res.status === 429) {
      return NextResponse.json({ error: "rate_limited", message: "Too many requests. Try again later." }, { status: 429 });
    }
    return NextResponse.json({ error: "powerbi_error", status: res.status }, { status: 502 });
  }

  // 4. Send back only what the UI needs
  const body = (await res.json()) as { value?: AdminGroup[] };
  const groups = body.value ?? [];

  return NextResponse.json(
    {
      workspaces: groups.map((g) => ({
        id: g.id,
        name: g.name,
        capacityId: g.capacityId ?? null,
        datasets: (g.datasets ?? []).map((d) => ({
          id: d.id,
          name: d.name,
          configuredBy: d.configuredBy ?? null,
          isRefreshable: d.isRefreshable ?? false,
        })),
      })),
      top,
      skip,
      hasMore: groups.length === top,
    },
    { headers: { "Cache-Control": "private, max-age=60" } }
  );
}