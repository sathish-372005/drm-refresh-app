"use client";

import { app, authentication } from "@microsoft/teams-js";
import { useEffect, useState } from "react";
import Workspaces from "../src/components/workspace";


export default function TeamsPage() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    app
      .initialize()
      .then(() => setReady(true))
      .catch(() => setError("Open this page inside Microsoft Teams."));
  }, []);

  if (error) return <p role="alert" style={{ padding: 24 }}>{error}</p>;
  if (!ready) return <p style={{ padding: 24 }}>Connecting to Teams…</p>;

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 24, fontFamily: "sans-serif" }}>
      <h1>Power BI Refresh</h1>
      {/* Teams caches tokens and refreshes them, so call this per request. */}
      <Workspaces
        getToken={() => authentication.getAuthToken()}
        onConsent={async () => {
          await authentication.authenticate({
            url: `${window.location.origin}/teams/auth-start`,
            width: 600,
            height: 535,
          });
        }}
        autoConsent
      />
    </main>
  );
}