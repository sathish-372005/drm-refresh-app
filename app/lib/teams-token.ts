import "server-only";

import {
  createLocalJWKSet,
  decodeJwt,
  jwtVerify,
  type JWK,
  type JWTPayload,
} from "jose";
import { serverConfig } from "./serverconfig";

const GUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const KEY_CACHE_TTL_MS = 60 * 60 * 1000;

type MicrosoftSigningKey = JWK & { issuer?: string };
type DiscoveryDocument = { issuer: string; jwks_uri: string };
type SigningKeysDocument = { keys: MicrosoftSigningKey[] };

export type VerifiedTeamsIdentity = {
  tenantId: string;
  objectId: string;
  userId: string;
  name: string | null;
  username: string | null;
  claims: JWTPayload;
};

export class TeamsAuthenticationError extends Error {
  constructor() {
    super("Invalid or expired Teams access token");
    this.name = "TeamsAuthenticationError";
  }
}

export class IdentityMetadataError extends Error {
  constructor() {
    super("Unable to load Microsoft identity metadata");
    this.name = "IdentityMetadataError";
  }
}

async function fetchMicrosoftJson<T>(url: string): Promise<T> {
  const parsedUrl = new URL(url);

  // Never fetch an arbitrary host derived from an incoming token.
  if (
    parsedUrl.protocol !== "https:" ||
    parsedUrl.hostname !== "login.microsoftonline.com" ||
    parsedUrl.port !== "" ||
    parsedUrl.username !== "" ||
    parsedUrl.password !== ""
  ) {
    throw new IdentityMetadataError();
  }

  try {
    const response = await fetch(parsedUrl, {
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new IdentityMetadataError();
    }

    return (await response.json()) as T;
  } catch {
    throw new IdentityMetadataError();
  }
}

// Tenant ids are validated GUIDs, so the cache cannot grow from junk input
// unless a real-looking tenant id is replayed; bounded below anyway.
const keyCache = new Map<
  string,
  { expiresAt: number; keys: MicrosoftSigningKey[] }
>();

async function loadSigningKeys(
  tenantId: string,
  expectedIssuer: string
): Promise<MicrosoftSigningKey[]> {
  const cached = keyCache.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.keys;
  }

  const discovery = await fetchMicrosoftJson<DiscoveryDocument>(
    `${expectedIssuer}/.well-known/openid-configuration`
  );

  if (discovery.issuer !== expectedIssuer) {
    throw new IdentityMetadataError();
  }

  const signingKeys = await fetchMicrosoftJson<SigningKeysDocument>(
    discovery.jwks_uri
  );

  if (!Array.isArray(signingKeys.keys)) {
    throw new IdentityMetadataError();
  }

  // If a key declares an issuer it must match this tenant.
  // Tenant-specific key documents may omit it; jwtVerify still
  // enforces the issuer claim strictly.
  const permittedKeys = signingKeys.keys.filter((key) => {
    if (key.issuer === undefined) return true;
    if (typeof key.issuer !== "string") return false;
    return key.issuer.replace("{tenantid}", tenantId) === expectedIssuer;
  });

  if (keyCache.size > 500) keyCache.clear();
  keyCache.set(tenantId, {
    expiresAt: Date.now() + KEY_CACHE_TTL_MS,
    keys: permittedKeys,
  });

  return permittedKeys;
}

export async function verifyTeamsToken(
  token: string
): Promise<VerifiedTeamsIdentity> {
  if (
    typeof token !== "string" ||
    token.length === 0 ||
    token.length > 32_768
  ) {
    throw new TeamsAuthenticationError();
  }

  let tenantId: string;

  try {
    // Only used to pick tenant metadata. NOT trusted yet.
    const unverifiedClaims = decodeJwt(token);

    if (
      typeof unverifiedClaims.tid !== "string" ||
      !GUID_PATTERN.test(unverifiedClaims.tid)
    ) {
      throw new TeamsAuthenticationError();
    }

    tenantId = unverifiedClaims.tid;
  } catch {
    throw new TeamsAuthenticationError();
  }

  const expectedIssuer = `${serverConfig.entra.authorityHost}/${tenantId}/v2.0`;

  const keys = await loadSigningKeys(tenantId, expectedIssuer);

  if (keys.length === 0) {
    throw new TeamsAuthenticationError();
  }

  const keySet = createLocalJWKSet({ keys });

  try {
    let result;
    try {
      result = await jwtVerify(token, keySet, {
        algorithms: ["RS256"],
        audience: serverConfig.entra.clientId,
        issuer: expectedIssuer,
        requiredClaims: ["exp", "iat", "tid", "oid", "scp"],
        clockTolerance: 5,
      });
    } catch {
      // Keys may have rotated: refresh once and retry.
      keyCache.delete(tenantId);
      const freshKeys = await loadSigningKeys(tenantId, expectedIssuer);
      result = await jwtVerify(token, createLocalJWKSet({ keys: freshKeys }), {
        algorithms: ["RS256"],
        audience: serverConfig.entra.clientId,
        issuer: expectedIssuer,
        requiredClaims: ["exp", "iat", "tid", "oid", "scp"],
        clockTolerance: 5,
      });
    }

    const payload = result.payload;

    if (
      payload.ver !== "2.0" ||
      payload.tid !== tenantId ||
      typeof payload.oid !== "string" ||
      !GUID_PATTERN.test(payload.oid)
    ) {
      throw new TeamsAuthenticationError();
    }

    const scopes =
      typeof payload.scp === "string" ? payload.scp.split(/\s+/) : [];

    if (!scopes.includes(serverConfig.entra.requiredTeamsScope)) {
      throw new TeamsAuthenticationError();
    }

    const username = payload.preferred_username ?? payload.upn;

    return {
      tenantId,
      objectId: payload.oid,
      userId: `${tenantId}:${payload.oid}`,
      name: typeof payload.name === "string" ? payload.name : null,
      username: typeof username === "string" ? username : null,
      claims: payload,
    };
  } catch (error) {
    if (error instanceof IdentityMetadataError) throw error;
    throw new TeamsAuthenticationError();
  }
}