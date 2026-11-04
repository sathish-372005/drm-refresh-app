"use client";

import {
  InteractionRequiredAuthError,
  PublicClientApplication,
} from "@azure/msal-browser";
const clientId =
  process.env.NEXT_PUBLIC_ENTRA_CLIENT_ID ||
  process.env.NEXT_PUBLIC_AZURE_CLIENT_ID ||
  "";

const apiScope =
  process.env.NEXT_PUBLIC_API_SCOPE ||
  (process.env.NEXT_PUBLIC_APP_ID_URI
    ? `${process.env.NEXT_PUBLIC_APP_ID_URI}/access_as_user`
    : "");

// Shown on the consent screen so the user approves everything once.
const powerBiScopes = [
  "https://analysis.windows.net/powerbi/api/Workspace.Read.All",
  "https://analysis.windows.net/powerbi/api/Dataset.ReadWrite.All",
];

let instance: PublicClientApplication | null = null;

async function msal() {
  if (!instance) {
    instance = new PublicClientApplication({
      auth: {
        clientId: process.env.NEXT_PUBLIC_ENTRA_CLIENT_ID!,
        authority: "https://login.microsoftonline.com/organizations",
        redirectUri: `${window.location.origin}/blank`,
        postLogoutRedirectUri: `${window.location.origin}/login`,
      },
      cache: { cacheLocation: "sessionStorage" },
    });
    await instance.initialize();
  }
  return instance;
}

function activeAccount(client: PublicClientApplication) {
  return client.getActiveAccount() ?? client.getAllAccounts()[0] ?? null;
}

export async function signIn(consent = false) {
  const client = await msal();
  const result = await client.loginPopup({
    scopes: [apiScope],
    extraScopesToConsent: powerBiScopes,
    prompt: consent ? "consent" : "select_account",
  });
  client.setActiveAccount(result.account);
}

export async function getUser() {
  const account = activeAccount(await msal());
  return account ? { name: account.name ?? null, username: account.username } : null;
}

/** Returns a valid API token, refreshing silently. Null means "go to login". */
export async function getWebToken(): Promise<string | null> {
  const client = await msal();
  const account = activeAccount(client);
  if (!account) return null;

  try {
    return (await client.acquireTokenSilent({ scopes: [apiScope], account })).accessToken;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      return (await client.acquireTokenPopup({ scopes: [apiScope], account })).accessToken;
    }
    throw error;
  }
}

export async function signOut() {
  const client = await msal();
  await client.logoutRedirect({ account: activeAccount(client) });
}