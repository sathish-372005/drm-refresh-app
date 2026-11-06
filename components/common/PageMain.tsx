import type { ReactNode } from "react";

export const PageMain = ({ children }: { children: ReactNode }) => (
  <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background px-4 pb-24 text-foreground">
    {children}
  </main>
);

