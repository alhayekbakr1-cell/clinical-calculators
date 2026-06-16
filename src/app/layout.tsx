import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Cardiac Vector Engine — ECG Teaching",
  description:
    "Interactive 12-lead ECG teaching tool: one cardiac vector, three synchronized views.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#020617",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans bg-slate-50 min-h-screen flex flex-col">
        <AppShell>
          {children}
        </AppShell>
        <SiteFooter />
      </body>
    </html>
  );
}
