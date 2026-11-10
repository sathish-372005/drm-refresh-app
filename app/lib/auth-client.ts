"use client";

import {
  InteractionRequiredAuthError,
  PublicClientApplication,
} from "@azure/msal-browser";
import { app as teamsApp, authentication } from "@microsoft/teams-js";

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

let clientPromise: Promise<PublicClientApplication> | null = null;
let teamsInitialization: Promise<void> | null = null;
let teamsInitialized = false;

export function isTeamsInitialized() {
  return teamsInitialized;
}

export function initializeTeams() {
  if (!teamsInitialization) {
    teamsInitialization = teamsApp
      .initialize()
      .then(() => {
        teamsInitialized = true;
      })
      .catch((error: unknown) => {
        teamsInitialization = null;
        teamsInitialized = false;
        throw error;
      });
  }
  return teamsInitialization;
}

function msal() {
  if (!clientPromise) {
    clientPromise = (async () => {
      if (!clientId || !apiScope) {
        throw new Error("Missing NEXT_PUBLIC client id or API scope. Check .env and restart.");
      }
      const client = new PublicClientApplication({
        auth: {
          clientId,
          authority: "https://login.microsoftonline.com/organizations",
          redirectUri: `${window.location.origin}/login`,
          postLogoutRedirectUri: `${window.location.origin}/login`,
        },
        cache: { cacheLocation: "sessionStorage" },
      });
      await client.initialize();

       try {
        const result = await client.handleRedirectPromise();
        if (result?.account) client.setActiveAccount(result.account);
      } catch (err) {
        // Don't replay a stale failed exchange on every page load.
        window.history.replaceState({}, "", window.location.pathname);
        sessionStorage.clear();
        throw err;
      }
      return client;
    })();
    // Allow a retry if setup failed.
    clientPromise.catch(() => (clientPromise = null));
  }
  return clientPromise;
}

function activeAccount(client: PublicClientApplication) {
  return client.getActiveAccount() ?? client.getAllAccounts()[0] ?? null;
}

/** Leaves the page for Microsoft, then returns to /login. */
export async function signIn(consent = false) {
  const client = await msal();
  await client.loginRedirect({
    scopes: [apiScope],
    extraScopesToConsent: powerBiScopes,
    prompt: consent ? "consent" : "select_account",
  });
}

export async function getUser() {
  const account = activeAccount(await msal());
  return account ? { name: account.name ?? null, username: account.username } : null;
}

let inTeams: Promise<boolean> | null = null;

export function detectTeams() {
  if (!inTeams) {
    inTeams = Promise.race([
      initializeTeams().then(() => true),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 2000)),
    ]).catch(() => false);
  }
  return inTeams;
}

/** Returns the signed-in user's name and email in both Web and Microsoft Teams. */
export async function getAppUser(): Promise<{ name: string | null; email: string | null } | null> {
  if (typeof window === "undefined") return null;

  // 1. In Teams, fetch context directly
  try {
    if (await detectTeams()) {
      const context = await teamsApp.getContext();
      if (context?.user) {
        return {
          name: context.user.displayName || null,
          email: context.user.userPrincipalName || null,
        };
      }
    }
  } catch {
    // ignore
  }

  // 2. In browser, fetch MSAL account
  try {
    const u = await getUser();
    if (u) {
      return { name: u.name, email: u.username };
    }
  } catch {
    // ignore
  }

  return null;
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
      await client.acquireTokenRedirect({ scopes: [apiScope], account });
      return null;
    }
    throw error;
  }
}

/** Uses Teams SSO when embedded in Teams and browser MSAL otherwise. */
export async function getAppToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (await detectTeams()) {
    try {
      return await authentication.getAuthToken();
    } catch (e) {
      console.error("Teams SSO failed", e);
      return null;
    }
  }
  return getWebToken();
}

export async function signOut() {
  const client = await msal();
  await client.logoutRedirect({ account: activeAccount(client) });
}
