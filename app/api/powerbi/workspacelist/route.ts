import { NextRequest, NextResponse } from "next/server";
import _ from "lodash";
import { powerBiGet, withPowerBi } from "@/app/lib/admin-request";
import { cached } from "@/app/lib/server-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FILTER = encodeURIComponent("type eq 'Workspace' and state eq 'Active'");
const TTL_MS = 5 * 60_000;

type AdminGroup = {
  id: string;
  name: string;
  capacityId?: string;
  datasets?: { id: string; name: string; configuredBy?: string; isRefreshable?: boolean }[];
};

export const GET = (req: NextRequest) =>
  withPowerBi(req, async ({ pbToken, identity }) => {
    const sp = req.nextUrl.searchParams;
    const top = _.clamp(Number(sp.get("top")) || 200, 1, 5000);
    const skip = Math.max(Number(sp.get("skip")) || 0, 0);
    const path = `/admin/groups?$top=${top}&$skip=${skip}&$expand=datasets&$filter=${FILTER}`;

    try {
      const groups = await cached(`ws:${identity.userId}:${top}:${skip}`, TTL_MS, async () => {
        const result = await powerBiGet<{ value?: AdminGroup[] }>(pbToken, path);
        if (!result.ok) throw result.response; // handled below, never cached
        return result.data.value ?? [];
      });

      return NextResponse.json({
        workspaces: groups.map(({ id, name, capacityId, datasets = [] }) => ({
          id,
          name,
          capacityId: capacityId ?? null,
          datasets: datasets.map((d) => ({
            id: d.id,
            name: d.name,
            configuredBy: d.configuredBy ?? null,
            isRefreshable: d.isRefreshable ?? false,
          })),
        })),
        top,
        skip,
        hasMore: groups.length === top,
      });
    } catch (e) {
      if (e instanceof NextResponse) return e;
      throw e;
    }
  });
