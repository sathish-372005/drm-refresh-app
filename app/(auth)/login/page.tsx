"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUser, signIn } from "@/app/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (window.parent !== window) {
      router.replace("/teams");
      return;
    }

    getUser().then((user) => user && router.replace("/"));
  }, [router]);

  async function handleSignIn() {
    setBusy(true);
    setError("");
    try {
      await signIn();
      router.replace("/");
    } catch {
      setError("Sign-in was cancelled or failed. Try again.");
      setBusy(false);
    }
  }
  return (
    <main style={{ maxWidth: 400, margin: "20vh auto", padding: 24, fontFamily: "sans-serif", textAlign: "center" }}>
      <h1>Power BI Refresh</h1>
      <button type="button" onClick={handleSignIn} disabled={busy}>
        {busy ? "Signing in…" : "Sign in with Microsoft"}
      </button>
      {error && <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>}
    </main>
  );
}