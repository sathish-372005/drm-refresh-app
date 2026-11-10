"use client";

import { useEffect, useState } from "react";
import { getAppToken, initializeTeams, isTeamsInitialized } from "@/app/lib/auth-client";
import { PageMain } from "@/components/common/PageMain";
import { WorkspaceListSkeleton } from "@/components/common/StateViews";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkspacesListView } from "@/components/workspace/WorkspacesListView";

export default function TeamsPage() {
  const [ready, setReady] = useState(isTeamsInitialized);
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
      <PageMain>
        <div className="-mx-4 flex flex-1 flex-col">
          <section
            aria-label="Connecting to Teams"
            className="-mx-0 bg-[#F2C811] px-5 pb-14 pt-5"
          >
            <Skeleton className="h-7 w-40 bg-black/10" />
            <Skeleton className="mt-2 h-3 w-48 bg-black/10" />
            <Skeleton className="mt-6 h-9 w-36 bg-black/10" />
            <Skeleton className="mt-5 h-12 w-full rounded-full bg-black/10" />
          </section>
          <section className="-mt-8 flex-1 space-y-4 rounded-t-[28px] bg-background px-4 pt-5">
            <WorkspaceListSkeleton />
          </section>
        </div>
      </PageMain>
    );
  }

  return (
    <PageMain>
      <WorkspacesListView getToken={getAppToken} />
    </PageMain>
  );
}
