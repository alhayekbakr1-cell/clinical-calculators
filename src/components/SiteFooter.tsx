"use client"

import { usePathname } from "next/navigation";

/**
 * Global footer for the QI tracker. The ECG teaching section is full-bleed and
 * provides its own chrome, so we hide this footer there.
 */
export default function SiteFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith("/ecg")) return null;

  return (
    <footer className="py-6 border-t bg-white">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <p className="text-sm text-slate-500">
          IM Resident QI Project Tracker &copy; {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
