"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import LoadingSkeleton from "@/components/LoadingSkeleton";

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const { user, restoring } = useAuth();

  useEffect(() => {
    if (!restoring && !user) router.replace("/");
  }, [restoring, router, user]);

  if (restoring || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <LoadingSkeleton className="h-72 w-full max-w-3xl" />
      </main>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-adyen-gray-50 p-6">{children}</main>
    </div>
  );
}

