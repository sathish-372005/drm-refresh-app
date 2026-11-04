import { getPowerBiAccessToken } from "@/app/lib/powerbi-auth";
import { serverConfig } from "@/app/lib/serverconfig";
import { IdentityMetadataError, TeamsAuthenticationError } from "@/app/lib/teams-token";
import { InteractionRequiredAuthError } from "@azure/msal-node";
import { NextResponse } from "next/server";



export const runtime = "nodejs";

export const dynamic = "force-dynamic";

function jsonResponse(
  body: unknown,
  status = 200,
  additionalHeaders?: HeadersInit
) {
  const headers = new Headers(additionalHeaders);

  headers.set("Cache-Control", "no-store");

  return NextResponse.json(body, {
    status,
    headers,
  });
}

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");

  const bearerMatch = authorization?.match(
    /^Bearer\s+(\S+)$/i
  );

  if (!bearerMatch) {
    return jsonResponse(
      {
        code: "MISSING_TEAMS_TOKEN",
        error: "A Teams bearer token is required.",
      },
      401
    );
  }

  const teamsToken = bearerMatch[1];

  try {
    // This helper already validates the Teams token.
    const { accessToken, identity } =
      await getPowerBiAccessToken(teamsToken);

    const response = await fetch(
      `${serverConfig.powerBi.baseUrl}/groups`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        const retryAfter =
          response.headers.get("Retry-After");

        return jsonResponse(
          {
            code: "POWERBI_THROTTLED",
            error:
              "Power BI is temporarily limiting requests. Try again later.",
          },
          429,
          retryAfter
            ? { "Retry-After": retryAfter }
            : undefined
        );
      }

      if (response.status === 403) {
        return jsonResponse(
          {
            code: "POWERBI_ACCESS_DENIED",
            error:
              "Power BI denied access. Check user permissions and application consent.",
          },
          403
        );
      }

      // Do not return raw upstream error bodies or tokens.
      return jsonResponse(
        {
          code: "POWERBI_REQUEST_FAILED",
          error: "Unable to retrieve Power BI workspaces.",
          upstreamStatus: response.status,
        },
        502
      );
    }

    const data = await response.json();

    if (!Array.isArray(data.value)) {
      throw new Error("Unexpected Power BI response");
    }

    return jsonResponse({
      user: {
        id: identity.userId,
        tenantId: identity.tenantId,
        objectId: identity.objectId,
        name: identity.name,
        username: identity.username,
      },

      workspaces: data.value,
    });
  } catch (error) {
    if (error instanceof TeamsAuthenticationError) {
      return jsonResponse(
        {
          code: "INVALID_TEAMS_TOKEN",
          error:
            "The Teams token is invalid or expired. Request a new token.",
        },
        401
      );
    }

    if (error instanceof IdentityMetadataError) {
      return jsonResponse(
        {
          code: "IDENTITY_SERVICE_UNAVAILABLE",
          error:
            "Unable to verify the sign-in right now. Try again shortly.",
        },
        503
      );
    }

    if (error instanceof InteractionRequiredAuthError) {
      return jsonResponse(
        {
          code: "INTERACTION_REQUIRED",
          error:
            "Microsoft requires consent or additional authentication before Power BI can be accessed.",
        },
        403
      );
    }

    // Log only a category—not credentials or token contents.
    console.error("Power BI workspace request failed", {
      type:
        error instanceof Error
          ? error.name
          : "UnknownError",
    });

    return jsonResponse(
      {
        code: "POWERBI_CONNECTION_FAILED",
        error:
          "Unable to connect to Power BI. Check the backend configuration and tenant consent.",
      },
      500
    );
  }
}