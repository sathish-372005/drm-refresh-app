"use client";

import { app } from "@microsoft/teams-js";
import { useEffect } from "react";

const clientId =
  process.env.NEXT_PUBLIC_ENTRA_CLIENT_ID ||
  process.env.NEXT_PUBLIC_AZURE_CLIENT_ID ||
  "";
const apiScope = process.env.NEXT_PUBLIC_API_SCOPE || "";

export default function AuthStart() {
  useEffect(() => {
    (async () => {
      await app.initialize();
      const params = new URLSearchParams({
        client_id: clientId,
        response_type: "code",
        redirect_uri: `${window.location.origin}/teams/auth-end`,
        response_mode: "fragment",
        scope: [
          "openid",
          "profile",
          apiScope,
          "https://analysis.windows.net/powerbi/api/Workspace.Read.All",
          "https://analysis.windows.net/powerbi/api/Dataset.ReadWrite.All",
        ].join(" "),
        prompt: "consent",
        // Required for SPA redirect URIs. The code is never redeemed:
        // we only need the user's consent to be recorded.
        code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
        code_challenge_method: "S256",
      });
      window.location.replace(
        `https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize?${params}`
      );
    })();
  }, []);

  return <p>Redirecting to Microsoft…</p>;
}