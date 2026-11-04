"use client";

import { app, authentication } from "@microsoft/teams-js";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";

type Workspace = {
  id: string;
  name: string;
};

type ConnectedUser = {
  id: string;
  tenantId: string;
  objectId: string;
  name: string | null;
  username: string | null;
};

type WorkspacesResponse = {
  user: ConnectedUser;
  workspaces: Workspace[];
};

type ApiError = {
  code?: string;
  error?: string;
};

export default function TeamsPage() {
  const [teamsReady, setTeamsReady] = useState(false);

  const [busy, setBusy] = useState<
    "sign-in" | "powerbi" | null
  >(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState<string | null>(
    null
  );

  const [user, setUser] = useState<ConnectedUser | null>(
    null
  );

  const [workspaces, setWorkspaces] = useState<
    Workspace[]
  >([]);

  const [hasLoadedWorkspaces, setHasLoadedWorkspaces] =
    useState(false);

  useEffect(() => {
    let active = true;

    async function initializeTeams() {
      try {
        await app.initialize();

        if (active) {
          setTeamsReady(true);
          setMessage("Teams initialized successfully.");
        }
      } catch {
        if (active) {
          setError(
            "Unable to initialize Teams. Open this page inside your installed Teams app."
          );
        }
      }
    }

    void initializeTeams();

    return () => {
      active = false;
    };
  }, []);

  function clearMessages() {
    setMessage("");
    setError("");
    setErrorCode(null);
  }

  async function handleAppSignIn() {
    clearMessages();
    setBusy("sign-in");

    try {
      const teamsToken =
        await authentication.getAuthToken();

      const result = await signIn("teams-sso", {
        token: teamsToken,
        redirect: false,
      });

      if (!result || result.error) {
        throw new Error(
          "Application sign-in failed. Check backend token validation and browser cookie settings."
        );
      }

      // Verify that the session cookie can actually be read.
      const sessionResponse = await fetch(
        "/api/auth/session",
        {
          credentials: "same-origin",
          cache: "no-store",
        }
      );

      if (!sessionResponse.ok) {
        throw new Error(
          "Unable to verify the application session."
        );
      }

      const session = await sessionResponse.json();

      if (!session?.user?.id) {
        throw new Error(
          "Sign-in completed, but no readable application session was found. Embedded-browser cookies may be blocked."
        );
      }

      setMessage("Signed in to the application.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in."
      );
    } finally {
      setBusy(null);
    }
  }

  async function handlePowerBiConnection() {
    clearMessages();
    setBusy("powerbi");

    setUser(null);
    setWorkspaces([]);
    setHasLoadedWorkspaces(false);

    try {
      // Request a valid Teams token for this API call.
      // Do not save it in localStorage or put it in a URL.
      const teamsToken =
        await authentication.getAuthToken();

      const response = await fetch(
        "/api/powerbi/workspace",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${teamsToken}`,
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      if (!response.ok) {
        const body = (await response
          .json()
          .catch(() => null)) as ApiError | null;

        setErrorCode(body?.code ?? null);

        throw new Error(
          body?.error ??
            `Power BI request failed: HTTP ${response.status}`
        );
      }

      const data =
        (await response.json()) as WorkspacesResponse;

      if (
        !data.user ||
        !Array.isArray(data.workspaces)
      ) {
        throw new Error(
          "The backend returned an unexpected response."
        );
      }

      setUser(data.user);
      setWorkspaces(data.workspaces);
      setHasLoadedWorkspaces(true);
      setMessage("Connected to Power BI successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to Power BI."
      );
    } finally {
      setBusy(null);
    }
  }

  const buttonsDisabled = !teamsReady || busy !== null;

  return (
    <main
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: 24,
        fontFamily: "sans-serif",
      }}
    >
      <h1>Power BI Refresh</h1>

      <p>
        First test your application sign-in, then test
        the Power BI connection.
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          margin: "20px 0",
        }}
      >
        <button
          type="button"
          disabled={buttonsDisabled}
          onClick={handleAppSignIn}
        >
          {busy === "sign-in"
            ? "Signing in…"
            : "1. Sign in to app"}
        </button>

        <button
          type="button"
          disabled={buttonsDisabled}
          onClick={handlePowerBiConnection}
        >
          {busy === "powerbi"
            ? "Connecting…"
            : "2. Connect Power BI"}
        </button>
      </div>

      {!teamsReady && !error && (
        <p>Initializing Teams…</p>
      )}

      {message && <p role="status">{message}</p>}

      {error && (
        <section role="alert" style={{ color: "#b91c1c" }}>
          <p>{error}</p>

          {errorCode && (
            <p>Error code: {errorCode}</p>
          )}

          {errorCode === "INTERACTION_REQUIRED" && (
            <p>
              Consent or additional authentication is
              required. This starter page does not yet
              implement the interactive consent flow.
            </p>
          )}
        </section>
      )}

      {user && (
        <section>
          <h2>Connected user</h2>

          <dl>
            <dt>Name</dt>
            <dd>{user.name ?? "Not available"}</dd>

            <dt>Username</dt>
            <dd>{user.username ?? "Not available"}</dd>

            <dt>Tenant ID</dt>
            <dd>{user.tenantId}</dd>
          </dl>
        </section>
      )}

      {hasLoadedWorkspaces && (
        <section>
          <h2>Workspaces ({workspaces.length})</h2>

          {workspaces.length === 0 ? (
            <p>
              Power BI returned no shared workspaces.
              This endpoint does not list datasets in
              My workspace.
            </p>
          ) : (
            <ul>
              {workspaces.map((workspace) => (
                <li key={workspace.id}>
                  {workspace.name}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}