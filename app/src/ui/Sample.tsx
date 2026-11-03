"use client";

import { useEffect, useState } from "react";
import * as teams from "@microsoft/teams-js";

type Me = { name: string | null; email: string | null; tenantId: string; userId: string };

export default function Home() {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await teams.app.initialize();
        const token = await teams.authentication.getAuthToken();
        const res = await fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } });
        const body = await res.json();
        if (!res.ok) throw new Error(JSON.stringify(body));
        setMe(body);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : JSON.stringify(e));
      }
    })();
  }, []);

  if (error) return <pre style={{ padding: 16, whiteSpace: "pre-wrap" }}>SSO failed: {error}</pre>;
  if (!me) return <p style={{ padding: 16 }}>Signing you in…</p>;

  return (
    <main style={{ padding: 16 }}>
      <h2>SSO works</h2>
      <p>Name: {me.name}</p>
      <p>Email: {me.email}</p>
      <p>Tenant: {me.tenantId}</p>
      <p>User ID: {me.userId}</p>
    </main>
  );
}