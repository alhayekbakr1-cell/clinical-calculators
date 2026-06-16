import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";
import SiteFooter from "@/components/SiteFooter";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "QI Project Tracker | AdventHealth",
  description: "Secure, role-based QI project tracking dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 min-h-screen flex flex-col`}>
        <AppShell>
          {children}
        </AppShell>
        <SiteFooter />
      </body>
    </html>
  );
}
