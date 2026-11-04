import "server-only";

import { ConfidentialClientApplication } from "@azure/msal-node";
import { verifyTeamsToken } from "./teams-token";
import { serverConfig } from "./serverconfig";

// One MSAL client per tenant (authority is tenant-specific).
const clients = new Map<string, ConfidentialClientApplication>();

function getClient(tenantId: string) {
  let client = clients.get(tenantId);
  if (!client) {
    client = new ConfidentialClientApplication({
      auth: {
        clientId: serverConfig.entra.clientId,
        clientSecret: serverConfig.entra.clientSecret,
        authority: `${serverConfig.entra.authorityHost}/${tenantId}`,
      },
    });
    clients.set(tenantId, client);
  }
  return client;
}

/**
 * Validates the Teams token, then exchanges it (OBO) for a Power BI token.
 * Server-side use only.
 */
export async function getPowerBiAccessToken(teamsToken: string) {
  // Tenant comes from the VERIFIED token, never unverified claims.
  const identity = await verifyTeamsToken(teamsToken);

  const result = await getClient(identity.tenantId).acquireTokenOnBehalfOf({
    oboAssertion: teamsToken,
    scopes: [...serverConfig.powerBi.scopes],
  });

  if (!result?.accessToken) {
    throw new Error("Power BI access token was not returned");
  }

  return {
    accessToken: result.accessToken,
    expiresOn: result.expiresOn,
    identity,
  };
}