import type { NextRequest } from "next/server";
import { config } from "@/app/lib/config";
import { AuthError, verifyEntraToken } from "@/app/lib/entra-token";
import { handleError, json } from "@/app/lib/http";
import { getPowerBiToken } from "@/app/lib/powerbi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ datasetid: string }>;
};

type PowerBiRefresh = {
  id?: number | string;
  refreshType?: "Scheduled" | "ViaApi" | string;
  startTime?: string;
  endTime?: string;
  status?: "Completed" | "Failed" | "InProgress" | "Unknown" | string;
  serviceExceptionJson?: string;
};

function formatDuration(startTime?: string, endTime?: string): string {
  if (!startTime || !endTime) return "—";
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  if (isNaN(start) || isNaN(end) || end < start) return "—";

  const diffSec = Math.round((end - start) / 1000);
  const minutes = Math.floor(diffSec / 60);
  const seconds = diffSec % 60;
  if (minutes === 0) return `${seconds} s`;
  return `${minutes} min ${seconds < 10 ? "0" : ""}${seconds} s`;
}

function parseErrorMessage(serviceExceptionJson?: string): string | null {
  if (!serviceExceptionJson) return null;
  try {
    const parsed = JSON.parse(serviceExceptionJson);
    const code = parsed?.errorCode || parsed?.error?.code;
    const msg =
      parsed?.error?.pbi?.error?.message ||
      parsed?.error?.message ||
      parsed?.message;
    if (msg) return msg;
    if (code) {
      if (code.includes("Credential") || code.includes("CredentialsNotSpecified")) {
        return "Data source credentials are not specified or have expired in Power BI.";
      }
      return code.replace(/([A-Z])/g, " $1").replace(/_/g, " - ").trim();
    }
    return serviceExceptionJson;
  } catch {
    return serviceExceptionJson;
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { datasetid } = await context.params;
    if (!datasetid) {
      return json({ code: "BAD_REQUEST", error: "Dataset ID is required." }, 400);
    }

    const match = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i);
    if (!match) throw new AuthError();

    const token = match[1];
    const identity = await verifyEntraToken(token);
    const powerBiToken = await getPowerBiToken(token, identity);

    const { searchParams } = new URL(request.url);
    const top = searchParams.get("top") || searchParams.get("$top") || "10";
    const groupId = searchParams.get("groupId") || searchParams.get("workspaceId");

    // Build URL candidates (workspace group first, then tenant root)
    const refreshUrls: string[] = [];
    if (groupId) {
      refreshUrls.push(
        `${config.powerBi.baseUrl}/groups/${encodeURIComponent(groupId)}/datasets/${encodeURIComponent(datasetid)}/refreshes?$top=${encodeURIComponent(top)}`
      );
    }
    refreshUrls.push(
      `${config.powerBi.baseUrl}/datasets/${encodeURIComponent(datasetid)}/refreshes?$top=${encodeURIComponent(top)}`
    );

    let rawRefreshes: PowerBiRefresh[] = [];
    let fetchError: { status: number; text: string } | null = null;

    for (const url of refreshUrls) {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${powerBiToken}`,
          Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });

      if (response.ok) {
        const data = await response.json().catch(() => null);
        if (data && Array.isArray(data.value)) {
          rawRefreshes = data.value;
          fetchError = null;
          break;
        }
      } else if (response.status !== 404) {
        fetchError = {
          status: response.status,
          text: await response.text().catch(() => ""),
        };
      }
    }

    if (fetchError && rawRefreshes.length === 0) {
      if (fetchError.status === 429) {
        return json(
          { code: "POWERBI_THROTTLED", error: "Power BI is limiting requests. Try again later." },
          429
        );
      }
      if (fetchError.status === 401 || fetchError.status === 403) {
        return json(
          { code: "POWERBI_ACCESS_DENIED", error: "Power BI denied access to this dataset." },
          403
        );
      }
    }

    // Try fetching schedule info
    let schedule = null;
    const scheduleUrl = groupId
      ? `${config.powerBi.baseUrl}/groups/${encodeURIComponent(groupId)}/datasets/${encodeURIComponent(datasetid)}/refreshSchedule`
      : `${config.powerBi.baseUrl}/datasets/${encodeURIComponent(datasetid)}/refreshSchedule`;

    try {
      const scheduleRes = await fetch(scheduleUrl, {
        headers: {
          Authorization: `Bearer ${powerBiToken}`,
          Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      if (scheduleRes.ok) {
        schedule = await scheduleRes.json().catch(() => null);
      }
    } catch {
      // Non-critical, schedule remains null
    }

    // Try fetching dataset details (storage mode, owner, etc.)
    let datasetDetails = null;
    const detailsUrl = groupId
      ? `${config.powerBi.baseUrl}/groups/${encodeURIComponent(groupId)}/datasets/${encodeURIComponent(datasetid)}`
      : `${config.powerBi.baseUrl}/datasets/${encodeURIComponent(datasetid)}`;

    try {
      const detailsRes = await fetch(detailsUrl, {
        headers: {
          Authorization: `Bearer ${powerBiToken}`,
          Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      if (detailsRes.ok) {
        datasetDetails = await detailsRes.json().catch(() => null);
      }
    } catch {
      // Non-critical
    }

    const formattedRefreshes = rawRefreshes.map((r) => ({
      id: r.id || `${r.startTime}_${r.status}`,
      refreshType: r.refreshType || "Scheduled",
      startTime: r.startTime,
      endTime: r.endTime,
      status: r.status || "Completed",
      durationText: formatDuration(r.startTime, r.endTime),
      errorMessage: r.serviceExceptionJson || parseErrorMessage(r.serviceExceptionJson),
      errorCode: (() => {
        try {
          const p = r.serviceExceptionJson ? JSON.parse(r.serviceExceptionJson) : null;
          return p?.errorCode || p?.error?.code || null;
        } catch {
          return null;
        }
      })(),
    }));

    return json({
      datasetId: datasetid,
      groupId: groupId || null,
      refreshes: formattedRefreshes,
      schedule,
      dataset: datasetDetails,
    });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Triggers an on-demand refresh for the dataset in Power BI
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { datasetid } = await context.params;
    if (!datasetid) {
      return json({ code: "BAD_REQUEST", error: "Dataset ID is required." }, 400);
    }

    const match = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i);
    if (!match) throw new AuthError();

    const token = match[1];
    const identity = await verifyEntraToken(token);
    const powerBiToken = await getPowerBiToken(token, identity);

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("groupId") || searchParams.get("workspaceId");

    const refreshUrl = groupId
      ? `${config.powerBi.baseUrl}/groups/${encodeURIComponent(groupId)}/datasets/${encodeURIComponent(datasetid)}/refreshes`
      : `${config.powerBi.baseUrl}/datasets/${encodeURIComponent(datasetid)}/refreshes`;

    const response = await fetch(refreshUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${powerBiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ notifyOption: "MailOnFailure" }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    if (response.status === 202 || response.ok) {
      return json({
        success: true,
        message: "Refresh triggered successfully in Power BI.",
      });
    }

    if (response.status === 409) {
      return json(
        {
          code: "REFRESH_ALREADY_IN_PROGRESS",
          error: "A refresh is already in progress for this dataset.",
        },
        409
      );
    }

    const errText = await response.text().catch(() => "");
    return json(
      {
        code: "REFRESH_FAILED",
        error: `Power BI rejected refresh request (HTTP ${response.status}). ${errText}`.trim(),
      },
      response.status
    );
  } catch (error) {
    return handleError(error);
  }
}
