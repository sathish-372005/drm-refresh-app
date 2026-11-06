"use client";

import { useEffect, useState } from "react";
import { getAppToken, initializeTeams } from "@/app/lib/auth-client";
import { PageMain } from "@/components/common/PageMain";
import { WorkspacesListView } from "@/components/workspace/WorkspacesListView";

export default function TeamsPage() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    initializeTeams()
      .then(() => setReady(true))
      .catch(() => setError("Open this page inside Microsoft Teams."));
  }, []);

  if (error) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center justify-center bg-background p-6 text-foreground">
        <p role="alert" className="text-center text-sm font-medium text-rose-600">
          {error}
        </p>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center justify-center bg-background p-6 text-foreground">
        <p className="text-center text-sm text-muted-foreground">Connecting to Teams…</p>
      </main>
    );
  }

  return (
    <PageMain>
      <WorkspacesListView getToken={getAppToken} />
    </PageMain>
  );
}
