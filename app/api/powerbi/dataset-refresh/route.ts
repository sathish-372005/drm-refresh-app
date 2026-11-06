import { NextRequest, NextResponse } from "next/server";
import chunk from "lodash/chunk";
import { powerBiGet, withPowerBi } from "@/app/lib/admin-request";
import { cached } from "@/app/lib/server-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GUID = /^[0-9a-f-]{36}$/i;
const BATCH_SIZE = 5;
const MAX_IDS = 100;
const TTL_MS = 5 * 60_000;

type Refresh = { status?: string; startTime?: string; endTime?: string };
type DatasetState = { status: string | null; endTime: string | null; error: number | null };
type Entry = readonly [string, DatasetState];

const fetchLatest = async (pbToken: string, groupId: string, id: string): Promise<Entry> => {
  const result = await powerBiGet<{ value?: Refresh[] }>(pbToken, `/groups/${groupId}/datasets/${id}/refreshes?$top=1`);
  if (!result.ok) return [id, { status: null, endTime: null, error: result.response.status }];
  const last = result.data.value?.[0];
  return [id, { status: last?.status ?? null, endTime: last?.endTime ?? last?.startTime ?? null, error: null }];
};

export const GET = (req: NextRequest) =>
  withPowerBi(req, async ({ pbToken, identity }) => {
    const sp = req.nextUrl.searchParams;
    const groupId = sp.get("groupId") ?? "";
    const ids = (sp.get("ids") ?? "").split(",").filter(Boolean).slice(0, MAX_IDS);

    if (!GUID.test(groupId) || ids.length === 0 || !ids.every((id) => GUID.test(id))) {
      return NextResponse.json({ error: "bad_request", message: "Invalid workspace or dataset ids." }, { status: 400 });
    }

    const entries = await cached(`refresh:${identity.userId}:${groupId}:${ids.join(",")}`, TTL_MS, () =>
      chunk(ids, BATCH_SIZE).reduce<Promise<Entry[]>>(async (accPromise, batch) => {
        const acc = await accPromise;
        // stop calling Power BI as soon as it says "too many requests"
        if (acc.some(([, s]) => s.error === 429)) return acc;
        const done = await Promise.all(batch.map((id) => fetchLatest(pbToken, groupId, id)));
        return [...acc, ...done];
      }, Promise.resolve([]))
    );

    return NextResponse.json({
      statuses: Object.fromEntries(entries),
      rateLimited: entries.some(([, s]) => s.error === 429),
      noAccess: entries.filter(([, s]) => s.error === 401 || s.error === 403).length,
    });
  });

