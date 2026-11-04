import "server-only";

function env(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export const config = {
  clientId: env("ENTRA_CLIENT_ID"),
  clientSecret: env("ENTRA_CLIENT_SECRET"),
  authorityHost: "https://login.microsoftonline.com",
  apiScopeName: "access_as_user",
  powerBi: {
    baseUrl: "https://api.powerbi.com/v1.0/myorg",
    oboScopes: ["https://analysis.windows.net/powerbi/api/.default"],
  },
} as const;