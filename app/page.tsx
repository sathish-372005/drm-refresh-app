"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { detectTeams, getUser, getAppToken } from "@/app/lib/auth-client";
import { PageMain } from "@/components/common/PageMain";
import { WorkspacesListView } from "@/components/workspace/WorkspacesListView";

const Home = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (await detectTeams()) {
        if (!cancelled) router.replace("/teams");
        return;
      }

      const user = await getUser();
      if (cancelled) return;
      if (!user) {
        router.replace("/login");
      } else {
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center justify-center bg-background p-6 text-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F2C811] border-t-transparent" />
      </main>
    );
  }

  return (
    <PageMain>
      <WorkspacesListView getToken={getAppToken} />
    </PageMain>
  );
};

export default Home;
