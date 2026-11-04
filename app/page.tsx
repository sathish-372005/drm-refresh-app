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
      <main className="mx-auto flex min-h-screen max-w-md items-center justify-center p-6 bg-[#f8fafc]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F2C811] border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md p-4 pt-6 pb-20 min-h-screen bg-[#f8fafc]">
      <DatasetsListView getToken={getWebToken} />
    </main>
  );
}
