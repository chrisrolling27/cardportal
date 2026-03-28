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
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-adyen-gray-50 via-white to-emerald-50 p-6">
      <div className="w-full max-w-md">
        <h1 className="mb-4 text-center text-3xl font-semibold tracking-tight text-adyen-black">CardPortal</h1>
        <p className="mb-6 text-center text-sm text-adyen-gray-700">
          Balance Platform cards, payouts, capital, and reporting.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}

