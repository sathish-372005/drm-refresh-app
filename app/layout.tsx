import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "../components/custom/navbar";
import { ThemeProvider } from "next-themes";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

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
    <html lang="en" className={`h-full antialiased font-sans ${inter.className}`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground antialiased transition-colors duration-150">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children}
          <BottomNav />
        </ThemeProvider>
      </body>
    </html>
  );
}
