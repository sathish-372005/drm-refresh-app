"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getWebToken } from "@/app/lib/auth-client";
import DatasetDetailView from "@/components/dataset/DatasetDetailView";

function DatasetDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();

  const datasetId = (params?.datasetid as string) || "";
  const datasetName = searchParams.get("name") || "Dataset Details";
  const workspaceId = searchParams.get("workspaceId") || "";
  const workspaceName = searchParams.get("workspaceName") || "Workspace";

  return (
    <DatasetDetailView
      datasetId={datasetId}
      datasetName={datasetName}
      workspaceId={workspaceId}
      workspaceName={workspaceName}
      getToken={getWebToken}
    />
  );
}

export default function DatasetDetailPage() {
  return (
    <main className="mx-auto w-full max-w-md p-4 pt-6 pb-20 min-h-screen bg-[#f8fafc]">
      <Suspense fallback={<div className="h-48 w-full animate-pulse rounded-2xl bg-white" />}>
        <DatasetDetailContent />
      </Suspense>
    </main>
  );
}
