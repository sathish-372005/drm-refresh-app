import { NextRequest, NextResponse } from "next/server";
import keyBy from "lodash/keyBy";
import mapValues from "lodash/mapValues";
import { powerBiGet, withPowerBi } from "@/app/lib/admin-request";
import { cached } from "@/app/lib/server-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TTL_MS = 5 * 60_000;

type Refreshable = {
  id: string;
  kind?: string;
  lastRefresh?: { status?: string; endTime?: string };
};

export const GET = (req: NextRequest) =>
  withPowerBi(req, async ({ pbToken, identity }) => {
    try {
      const items = await cached(`status:${identity.userId}`, TTL_MS, async () => {
        const result = await powerBiGet<{ value?: Refreshable[] }>(pbToken, "/admin/capacities/refreshables?$top=200");
        if (!result.ok) throw result.response;
        return result.data.value ?? [];
      });

      const datasets = items.filter((r) => !r.kind || r.kind === "Dataset");
      const statuses = mapValues(keyBy(datasets, "id"), (r) => ({
        status: r.lastRefresh?.status ?? null,
        endTime: r.lastRefresh?.endTime ?? null,
      }));
      return NextResponse.json({ statuses });
    } catch (e) {
      if (e instanceof NextResponse) return e;
      throw e;
    }
  });
