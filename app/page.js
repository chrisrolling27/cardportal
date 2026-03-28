"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { useAuth } from "@/context/AuthContext";
import LoadingSkeleton from "@/components/LoadingSkeleton";

export default function LandingPage() {
  const router = useRouter();
  const { user, restoring } = useAuth();

  useEffect(() => {
    if (user) router.replace("/home");
  }, [router, user]);

  if (restoring) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <LoadingSkeleton className="h-72 w-full max-w-md" />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4F6FA] p-6">
      <div className="w-full max-w-md">
        <p className="mb-2 text-center text-xs font-medium uppercase tracking-[0.14em] text-[#6A7993]">Adyen</p>
        <h1 className="mb-2 text-center text-4xl font-semibold tracking-tight text-[#0B1222]">CardPortal</h1>
        <p className="mb-6 text-center text-sm text-[#53627B]">
          Dashboard for Balance Platform demos.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}

