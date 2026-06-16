"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * This deployment is the ECG teaching app. The root sends visitors straight
 * into it. (The QI tracker routes still exist under /projects, /metrics, etc.)
 */
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/ecg");
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
      <div className="text-center">
        <p className="text-lg font-bold text-white">Cardiac Vector Engine</p>
        <p className="text-sm text-slate-400 mt-1">Opening the ECG app…</p>
        <a href="./ecg/" className="text-sky-400 text-sm underline mt-3 inline-block">
          Continue to /ecg
        </a>
      </div>
    </main>
  );
}
