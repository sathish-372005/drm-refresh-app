import "server-only";
import { ConfidentialClientApplication } from "@azure/msal-node";
import { config } from "./config";

const clients = new Map<string, ConfidentialClientApplication>();

// Tenant comes from the VERIFIED token, never from unverified claims.
export function oboClient(tenantId: string) {
  let client = clients.get(tenantId);
  if (!client) {
    if (clients.size > 500) clients.clear();
    client = new ConfidentialClientApplication({
      auth: {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        authority: `${config.authorityHost}/${tenantId}`,
      },
    });
    clients.set(tenantId, client);
  }
  return client;
}