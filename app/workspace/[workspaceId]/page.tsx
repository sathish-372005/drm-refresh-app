"use client";

import { use } from "react";
import { getAppToken } from "@/app/lib/auth-client";
import { PageMain } from "@/components/common/PageMain";
import { WorkspaceDatasetsView } from "@/components/workspace/WorkspaceDatasetsView";

const WorkspacePage = ({ params }: { params: Promise<{ workspaceId: string }> }) => {
  const { workspaceId } = use(params);

  return (
    <PageMain>
      <WorkspaceDatasetsView workspaceId={workspaceId} getToken={getAppToken} />
    </PageMain>
  );
};

export default WorkspacePage;

