import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "../components/custom/navbar";
import { ThemeProvider } from "next-themes";

export const metadata: Metadata = {
  title: "Refresh Schedule",
  description: "View Power BI dataset refresh schedules and history in Microsoft Teams.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased font-sans" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground antialiased transition-colors duration-150">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children}
          <BottomNav />
        </ThemeProvider>
      </body>
    </html>
  );
}
