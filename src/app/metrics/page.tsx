"use client"

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function MetricsRedirect() {
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        router.replace("/projects");
    }, [router]);

    return (
        <div className="flex justify-center items-center min-h-screen">
            Redirecting to Projects...
        </div>
    );
}
