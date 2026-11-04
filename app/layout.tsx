import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { FC } from "react";
import BottomNav from "./src/components/navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Refresh Schedule",
  description: "View Power BI dataset refresh schedules and history in Microsoft Teams.",
};

export const HomeLayout: FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col pb-24">
        {children}
        <BottomNav />
      </body>
    </html>
  );
}

export default HomeLayout;