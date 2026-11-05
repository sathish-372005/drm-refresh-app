import type { NextRequest } from "next/server";
import { AuthError, verifyEntraToken } from "@/app/lib/entra-token";
import { handleError, json } from "@/app/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const match = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i);
    if (!match) throw new AuthError();

    const token = match[1];
    const identity = await verifyEntraToken(token);

    return json({
      name: identity.name,
      email: identity.username,
      userId: identity.userId,
      tenantId: identity.tenantId,
    });
  } catch (error) {
    return handleError(error);
  }
}

