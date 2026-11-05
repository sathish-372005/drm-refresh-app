"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUser, getWebToken } from "@/app/lib/auth-client";
import DatasetsListView from "@/components/dataset/DatasetsListView";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If inside Teams iframe, redirect to /teams
    if (typeof window !== "undefined" && window.parent !== window) {
      router.replace("/teams");
      return;
    }

    getUser().then((user) => {
      if (!user) {
        router.replace("/login");
      } else {
        setLoading(false);
      }
    });
  }, [router]);

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center justify-center bg-background p-6 text-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F2C811] border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background px-4 pb-20 pt-0 text-foreground">
      <DatasetsListView getToken={getWebToken} />
    </main>
  );
}
