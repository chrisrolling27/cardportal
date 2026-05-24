"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import LoadingSkeleton from "@/components/LoadingSkeleton";

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, restoring, setSession } = useAuth();
  const [rehydrating, setRehydrating] = useState(false);
  const rehydrateAttempted = useRef(false);

  useEffect(() => {
    if (restoring || user) return;

    const accountHolderId = searchParams?.get("accountHolderId") || "";
    if (accountHolderId && !rehydrateAttempted.current) {
      rehydrateAttempted.current = true;
      setRehydrating(true);
      (async () => {
        try {
          const res = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accountHolderId }),
          });
          if (!res.ok) throw new Error("Rehydrate failed");
          const data = await res.json();
          setSession(data);
          const params = new URLSearchParams(searchParams.toString());
          params.delete("accountHolderId");
          const qs = params.toString();
          router.replace(qs ? `${pathname}?${qs}` : pathname);
        } catch {
          router.replace("/");
        } finally {
          setRehydrating(false);
        }
      })();
      return;
    }

    if (!accountHolderId) router.replace("/");
  }, [pathname, restoring, router, searchParams, setSession, user]);

  if (restoring || rehydrating || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <LoadingSkeleton className="h-72 w-full max-w-3xl" />
      </main>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 bg-[#F4F6FA] p-6">{children}</main>
    </div>
  );
}

