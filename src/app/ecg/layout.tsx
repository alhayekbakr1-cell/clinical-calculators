import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "ECG Vector Engine · Cardiology Teaching",
  description:
    "One clock, one cardiac vector, three synchronized views — conduction, axis vector, and the 12-lead tracing.",
};

export default function EcgLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased">
      {children}
    </div>
  );
}
