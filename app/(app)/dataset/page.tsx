import { getWebToken } from "@/app/lib/auth-client";
import DatasetsListView from "@/components/dataset/DatasetsListView";

export default function DatasetsPage() {
  return (
    <main className="mx-auto w-full max-w-md p-4 pt-6 pb-20 min-h-screen bg-[#f8fafc]">
      <DatasetsListView getToken={getWebToken} />
    </main>
  );
}
