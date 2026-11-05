import { getAppToken } from "@/app/lib/auth-client";
import DatasetsListView from "@/components/dataset/DatasetsListView";

export default function DatasetsPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background px-4 pb-20 pt-0 text-foreground">
      <DatasetsListView getToken={getAppToken} />
    </main>
  );
}
