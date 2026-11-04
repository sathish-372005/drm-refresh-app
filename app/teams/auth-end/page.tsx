"use client";

import { app, authentication } from "@microsoft/teams-js";
import { useEffect } from "react";

export default function AuthEnd() {
  useEffect(() => {
    (async () => {
      try {
        await app.initialize();
        const hash = new URLSearchParams(window.location.hash.slice(1));
        const error = hash.get("error");
        if (error) authentication.notifyFailure(error);
        else authentication.notifySuccess("ok");
      } catch {
        // Popup closed or Teams unavailable.
      }
    })();
  }, []);

  return <p>Finishing sign-in…</p>;
}