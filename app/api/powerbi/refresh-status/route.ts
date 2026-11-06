import { NextRequest, NextResponse } from "next/server";
import _ from "lodash";
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
    const workspaceId = req.nextUrl.searchParams.get("workspaceId");

    // Per-workspace status resolution for ALL datasets in the workspace
    if (workspaceId) {
      const gid = encodeURIComponent(workspaceId);
      try {
        const statuses = await cached(
          `ws-status:${identity.userId}:${workspaceId}`,
          TTL_MS,
          async (): Promise<Record<string, { status: string | null; endTime: string | null }>> => {
            const list = await powerBiGet<{ value?: { id: string }[] }>(
              pbToken,
              `/admin/groups/${gid}/datasets`
            );
            if (!list.ok) return {};

            const allDatasets = list.data.value ?? [];
            const results = await Promise.allSettled(
              allDatasets.map((d) =>
                powerBiGet<{ value?: { status?: string; endTime?: string }[] }>(
                  pbToken,
                  `/groups/${gid}/datasets/${encodeURIComponent(d.id)}/refreshes?$top=1`
                )
              )
            );

            const out: Record<string, { status: string | null; endTime: string | null }> = {};
            results.forEach((r, idx) => {
              const d = allDatasets[idx];
              if (!d) return;
              const latest =
                r.status === "fulfilled" && r.value.ok ? r.value.data.value?.[0] : undefined;
              out[d.id] = {
                status: latest?.status ?? null,
                endTime: latest?.endTime ?? null,
              };
            });
            return out;
          }
        );
        return NextResponse.json({ statuses });
      } catch (e) {
        if (e instanceof NextResponse) return e;
        return NextResponse.json({ statuses: {} });
      }
    }

    // Default: Bulk capacities refreshables (up to 1000 items)
    try {
      const items = await cached(`status:${identity.userId}`, TTL_MS, async () => {
        const result = await powerBiGet<{ value?: Refreshable[] }>(
          pbToken,
          "/admin/capacities/refreshables?$top=1000"
        );
        if (!result.ok) return []; // Non-capacity / Pro tenants return empty array safely
        return result.data.value ?? [];
      });

      const datasets = items.filter((r) => !r.kind || r.kind === "Dataset");
      const statuses = _.mapValues(_.keyBy(datasets, "id"), (r) => ({
        status: r.lastRefresh?.status ?? null,
        endTime: r.lastRefresh?.endTime ?? null,
      }));
      return NextResponse.json({ statuses });
    } catch (e) {
      if (e instanceof NextResponse) return e;
      return NextResponse.json({ statuses: {} });
    }
  });
