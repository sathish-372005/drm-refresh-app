"use client";

import { useEffect, useState } from "react";
import DatasetsListView from "@/components/dataset/DatasetsListView";
import { getAppToken, initializeTeams } from "@/app/lib/auth-client";

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
      <main className="mx-auto flex min-h-screen max-w-md items-center justify-center p-6 bg-[#f8fafc]">
        <p role="alert" className="text-center text-sm font-medium text-rose-600">
          {error}
        </p>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center justify-center p-6 bg-[#f8fafc]">
        <p className="text-center text-sm text-slate-500">Connecting to Teams…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md p-4 pt-6 pb-20 min-h-screen bg-[#f8fafc]">
      <DatasetsListView getToken={getAppToken} />
    </main>
  );
}
