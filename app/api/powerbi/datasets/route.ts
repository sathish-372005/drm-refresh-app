import type { NextRequest } from "next/server";
import { config } from "@/app/lib/config";
import { AuthError, verifyEntraToken } from "@/app/lib/entra-token";
import { handleError, json } from "@/app/lib/http";
import { getPowerBiToken } from "@/app/lib/powerbi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Max parallel Power BI requests (keeps us clear of 429 throttling)
const CONCURRENCY = 5;

type Workspace = {
  id: string;
  name: string;
};

type Dataset = {
  id: string;
  name: string;
  configuredBy?: string | null;
  webUrl?: string;
  isRefreshable?: boolean;
  targetStorageMode?: string;
  createdDate?: string;
  lastRefresh?: {
    status: string;
    startTime?: string;
    endTime?: string;
    refreshType?: string;
    serviceExceptionJson?: string;
  } | null;
  schedule?: {
    enabled?: boolean;
    days?: string[];
    times?: string[];
    localTimeZoneId?: string;
  } | null;
};

// Full dataset body as returned by Power BI (webUrl, isRefreshable, createdDate, ...)
type PowerBiDataset = Dataset & Record<string, unknown>;

type CollectionResult<T> = { value?: T[]; error?: Response };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isWorkspace(value: unknown): value is Workspace {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string"
  );
}

function isDataset(value: unknown): value is PowerBiDataset {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    (value.configuredBy === undefined ||
      value.configuredBy === null ||
      typeof value.configuredBy === "string")
  );
}

function powerBiError(response: Response, resource: string) {
  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After");
    return json(
      { code: "POWERBI_THROTTLED", error: "Power BI is limiting requests. Try again later." },
      429,
      retryAfter ? { "Retry-After": retryAfter } : undefined
    );
  }
  if (response.status === 401 || response.status === 403) {
    return json(
      { code: "POWERBI_ACCESS_DENIED", error: "Power BI denied access for your account." },
      403
    );
  }
  return json(
    { code: "POWERBI_REQUEST_FAILED", error: `Unable to load Power BI ${resource}.` },
    502
  );
}

async function getCollection<T>(
  url: string,
  token: string,
  resource: string,
  isItem: (item: unknown) => item is T
): Promise<CollectionResult<T>> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) return { error: response };

  const body: unknown = await response.json();
  if (!isRecord(body) || !Array.isArray(body.value) || !body.value.every(isItem)) {
    throw new Error(`Unexpected Power BI ${resource} response`);
  }

  return { value: body.value };
}

// Runs fn over items with at most `limit` in flight, preserving result order
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );
  return results;
}

export async function GET(request: NextRequest) {
  try {
    const match = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i);
    if (!match) throw new AuthError();

    const token = match[1];
    const identity = await verifyEntraToken(token);
    const username = identity.username?.trim().toLowerCase();
    if (!username) {
      return json(
        { code: "USER_IDENTITY_UNAVAILABLE", error: "Unable to identify the signed-in user." },
        403
      );
    }

    const powerBiToken = await getPowerBiToken(token, identity);

    // 1. All workspaces (groups) the user can see
    const groupsResult = await getCollection(
      `${config.powerBi.baseUrl}/groups`,
      powerBiToken,
      "workspaces",
      isWorkspace
    );
    if (groupsResult.error) return powerBiError(groupsResult.error, "workspaces");

    // 2. Datasets of every workspace, in parallel (limited)
    const results = await mapWithConcurrency(
      groupsResult.value ?? [],
      CONCURRENCY,
      async (workspace) => ({
        workspace,
        result: await getCollection(
          `${config.powerBi.baseUrl}/groups/${encodeURIComponent(workspace.id)}/datasets`,
          powerBiToken,
          "datasets",
          isDataset
        ),
      })
    );

    // Fail on throttling / auth / server errors; skip workspaces we simply can't read
    const fatal = results.find(({ result }) => {
      const status = result.error?.status;
      return status !== undefined && status !== 403 && status !== 404;
    });
    if (fatal?.result.error) return powerBiError(fatal.result.error, "datasets");

    // 3. Keep only datasets configured by the current user
    const filteredWorkspaces = results
      .map(({ workspace, result }) => {
        const datasets = (result.value ?? []).filter(
          (dataset) => dataset.configuredBy?.trim().toLowerCase() === username
        );
        return { ...workspace, datasetCount: datasets.length, datasets };
      })
      .filter((workspace) => workspace.datasetCount > 0);

    // 4. Fetch latest refresh and schedule for each dataset in parallel
    const datasetRefs = filteredWorkspaces.flatMap((w) =>
      w.datasets.map((d) => ({ workspaceId: w.id, dataset: d }))
    );

    const enriched = await mapWithConcurrency(
      datasetRefs,
      CONCURRENCY,
      async ({ workspaceId, dataset }) => {
        let lastRefresh: Dataset["lastRefresh"] = null;
        let schedule: Dataset["schedule"] = null;

        try {
          const refRes = await fetch(
            `${config.powerBi.baseUrl}/groups/${encodeURIComponent(workspaceId)}/datasets/${encodeURIComponent(dataset.id)}/refreshes?$top=1`,
            {
              headers: { Authorization: `Bearer ${powerBiToken}`, Accept: "application/json" },
              cache: "no-store",
              signal: AbortSignal.timeout(10_000),
            }
          );
          if (refRes.ok) {
            const data = await refRes.json().catch(() => null);
            if (data?.value?.[0]) {
              const r = data.value[0];
              lastRefresh = {
                status: r.status || "Completed",
                startTime: r.startTime,
                endTime: r.endTime,
                refreshType: r.refreshType || "Scheduled",
                serviceExceptionJson: r.serviceExceptionJson,
              };
            }
          }
        } catch {
          // ignore individual failure
        }

        try {
          const schedRes = await fetch(
            `${config.powerBi.baseUrl}/groups/${encodeURIComponent(workspaceId)}/datasets/${encodeURIComponent(dataset.id)}/refreshSchedule`,
            {
              headers: { Authorization: `Bearer ${powerBiToken}`, Accept: "application/json" },
              cache: "no-store",
              signal: AbortSignal.timeout(10_000),
            }
          );
          if (schedRes.ok) {
            schedule = await schedRes.json().catch(() => null);
          }
        } catch {
          // ignore
        }

        return {
          id: dataset.id,
          lastRefresh,
          schedule,
        };
      }
    );

    const enrichedMap = new Map(enriched.map((e) => [e.id, e]));

    const workspaces = filteredWorkspaces.map((w) => ({
      ...w,
      datasets: w.datasets.map((d) => {
        const extra = enrichedMap.get(d.id);
        return {
          ...d,
          lastRefresh: extra?.lastRefresh ?? null,
          schedule: extra?.schedule ?? null,
        };
      }),
    }));

    return json({
      totalWorkspaces: workspaces.length,
      totalDatasets: workspaces.reduce((sum, w) => sum + w.datasetCount, 0),
      workspaces,
    });
  } catch (error) {
    return handleError(error);
  }
}
