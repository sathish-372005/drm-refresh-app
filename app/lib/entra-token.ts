import "server-only";
import { createRemoteJWKSet, decodeJwt, jwtVerify } from "jose";
import { config } from "./config";

const GUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Identity = {
  tenantId: string;
  objectId: string;
  userId: string;
  name: string | null;
  username: string | null;
};

export class AuthError extends Error {
  constructor() {
    super("Invalid or expired token");
    this.name = "AuthError";
  }
}

// jose caches keys and refetches on rotation. The host is fixed and the
// tenant id is a validated GUID, so no arbitrary URL is ever fetched.
const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function keySetFor(tenantId: string) {
  let keySet = keySets.get(tenantId);
  if (!keySet) {
    if (keySets.size > 500) keySets.clear();
    keySet = createRemoteJWKSet(
      new URL(`${config.authorityHost}/${tenantId}/discovery/v2.0/keys`)
    );
    keySets.set(tenantId, keySet);
  }
  return keySet;
}

/** Verifies an Entra v2 access token issued for THIS app's API. */
export async function verifyEntraToken(token: string): Promise<Identity> {
  if (typeof token !== "string" || !token || token.length > 32_768) {
    throw new AuthError();
  }

  try {
    // Unverified: only used to choose which tenant's keys to load.
    const tid = decodeJwt(token).tid;
    if (typeof tid !== "string" || !GUID.test(tid)) throw new AuthError();

    const { payload } = await jwtVerify(token, keySetFor(tid), {
      algorithms: ["RS256"],
      audience: config.clientId,
      issuer: `${config.authorityHost}/${tid}/v2.0`,
      requiredClaims: ["exp", "iat", "tid", "oid", "scp"],
      clockTolerance: 5,
    });

    const oid = payload.oid;
    const scopes =
      typeof payload.scp === "string" ? payload.scp.split(" ") : [];

    if (
      payload.ver !== "2.0" ||
      payload.tid !== tid ||
      typeof oid !== "string" ||
      !GUID.test(oid) ||
      !scopes.includes(config.apiScopeName)
    ) {
      throw new AuthError();
    }

    const username = payload.preferred_username ?? payload.upn;

    return {
      tenantId: tid,
      objectId: oid,
      userId: `${tid}:${oid}`,
      name: typeof payload.name === "string" ? payload.name : null,
      username: typeof username === "string" ? username : null,
    };
  } catch {
    throw new AuthError();
  }
}