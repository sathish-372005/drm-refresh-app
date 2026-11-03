import { NextRequest } from "next/server";
import { createRemoteJWKSet, jwtVerify, decodeJwt } from "jose";

const JWKS = createRemoteJWKSet(
  new URL("https://login.microsoftonline.com/common/discovery/v2.0/keys")
);
// Microsoft's fixed tenant ID for personal accounts, which are not supported
const CONSUMER_TENANT = "9188040d-6c67-4c5b-b112-36a304b66dad";

export type TeamsUser = {
  raw: string;
  tid: string;
  oid: string;
  name?: string;
  email?: string;
};

export async function getUser(req: NextRequest): Promise<TeamsUser | null> {
  const raw = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!raw) return null;

  try {
    const { tid } = decodeJwt(raw);
    if (typeof tid !== "string" || tid === CONSUMER_TENANT) return null;

    const { payload } = await jwtVerify(raw, JWKS, {
      issuer: `https://login.microsoftonline.com/${tid}/v2.0`,
      audience: [process.env.AZURE_CLIENT_ID!, process.env.APP_ID_URI!],
    });

    if (!String(payload.scp ?? "").split(" ").includes("access_as_user")) return null;

    return {
      raw,
      tid,
      oid: payload.oid as string,
      name: payload.name as string | undefined,
      email: (payload.preferred_username ?? payload.upn) as string | undefined,
    };
  } catch (e) {
    console.error("Token validation failed:", e);
    return null;
  }
}