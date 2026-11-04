import "server-only";

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const clientId = requiredEnvironmentVariable("ENTRA_CLIENT_ID");

const guidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

if (!guidPattern.test(clientId)) {
  throw new Error("ENTRA_CLIENT_ID must be a valid application GUID");
}

const appIdUri = requiredEnvironmentVariable("APP_ID_URI");
const authUrl = requiredEnvironmentVariable("AUTH_URL").replace(/\/+$/, "");

if (new URL(authUrl).protocol !== "https:") {
  throw new Error("AUTH_URL must use HTTPS for this Teams deployment");
}

export const serverConfig = {
  entra: {
    clientId,
    clientSecret: requiredEnvironmentVariable("ENTRA_CLIENT_SECRET"),
    appIdUri,
    authorityHost: "https://login.microsoftonline.com",
    requiredTeamsScope: "access_as_user",
    consentRedirectUri: `${authUrl}/teams/auth-end`,
  },

  auth: {
    url: authUrl,
    secret: requiredEnvironmentVariable("AUTH_SECRET"),
  },

  powerBi: {
    baseUrl: "https://api.powerbi.com/v1.0/myorg",
    // Uses the delegated permissions configured on the app registration.
    scopes: ["https://analysis.windows.net/powerbi/api/.default"],
  },
} as const;