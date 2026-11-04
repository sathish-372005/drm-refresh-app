"use client";

import { useEffect, useState } from "react";

type Workspace = { id: string; name: string };

type Props = {
  getToken: () => Promise<string | null>;
  onUnauthenticated?: () => void;
  /** Web only: reopens Microsoft sign-in with the consent screen. */
  onConsent?: () => Promise<void>;
};

export default function Workspaces({ getToken, onUnauthenticated, onConsent }: Props) {
  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);
  const [needConsent, setNeedConsent] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    setNeedConsent(false);
    try {
      const token = await getToken();
      if (!token) return onUnauthenticated?.();

      const res = await fetch("/api/powerbi/workspaces", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const body = await res.json().catch(() => null);

      if (res.ok) return setWorkspaces(body.workspaces);
      if (body?.code === "UNAUTHENTICATED") return onUnauthenticated?.();
      if (body?.code === "INTERACTION_REQUIRED") return setNeedConsent(true);
      setError(body?.error ?? `Request failed (HTTP ${res.status}).`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load workspaces.");
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function grant() {
    try {
      await onConsent?.();
      await load();
    } catch {
      setError("Access was not granted.");
    }
  }

  if (needConsent) {
    return onConsent ? (
      <>
        <p>Approve access to Power BI (one time).</p>
        <button type="button" onClick={grant}>Grant access</button>
      </>
    ) : (
      <p>
        Power BI access has not been approved yet. Open the web app once, sign in
        and approve access, then reopen this tab.
      </p>
    );
  }

  if (error) return <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>;
  if (!workspaces) return <p>Loading workspaces…</p>;

  return (
    <>
      <h2>Workspaces ({workspaces.length})</h2>
      {workspaces.length === 0 ? (
        <p>No shared workspaces found. “My workspace” is not listed by this endpoint.</p>
      ) : (
        <ul>
          {workspaces.map((w) => <li key={w.id}>{w.name}</li>)}
        </ul>
      )}
    </>
  );
}