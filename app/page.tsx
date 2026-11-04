"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getUser, getWebToken, signIn, signOut } from "@/app/lib/auth-client";
import Workspaces from "./src/components/workspace";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string | null; username: string } | null>(null);

  useEffect(() => {
    if (window.parent !== window) {
      router.replace("/teams");
      return;
    }

    getUser().then((u) => (u ? setUser(u) : router.replace("/login")));
  }, [router]);

  if (!user) return <p style={{ padding: 24 }}>Loading…</p>;

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 24, fontFamily: "sans-serif" }}>
      <h1>Power BI Refresh</h1>
      <p>
        Signed in as <strong>{user.name ?? user.username}</strong>{" "}
        <button type="button" onClick={() => signOut()}>Sign out</button>
      </p>
      <Workspaces
        getToken={getWebToken}
        onUnauthenticated={() => router.replace("/login")}
        onConsent={() => signIn(true)}
      />
    </main>
  );
}