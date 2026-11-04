import "server-only";
import { config } from "./config";
import type { Identity } from "./entra-token";
import { oboClient } from "./msal";

export async function getPowerBiToken(token: string, identity: Identity) {
  const result = await oboClient(identity.tenantId).acquireTokenOnBehalfOf({
    oboAssertion: token,
    scopes: [...config.powerBi.oboScopes],
  });

  if (!result?.accessToken) throw new Error("No Power BI token returned");
  return result.accessToken;
}