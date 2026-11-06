"use client";

import { getAppToken } from "@/app/lib/auth-client";
import { PageMain } from "@/components/common/PageMain";
import { WorkspacesListView } from "@/components/workspace/WorkspacesListView";

export default function HomePage() {
  return (
    <PageMain>
      <WorkspacesListView getToken={getAppToken} />
    </PageMain>
  );
}

