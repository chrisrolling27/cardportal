"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApiHistory } from "@/context/ApiHistoryContext";
import { useAuth } from "@/context/AuthContext";

export default function LoginForm() {
  const router = useRouter();
  const { trackedFetch } = useApiHistory();
  const { setSession } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onLogin = async (event) => {
    event.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    const data = await trackedFetch("/api/login", {
      method: "POST",
    });
    setSession(data);
    router.push("/home");
  }

  return (
    <div className="ca-surface w-full max-w-md p-7">
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          try {
            await onLogin(event);
          } catch (err) {
            setError(err.message || "Unable to log in.");
          } finally {
            setLoading(false);
          }
        }}
      >
        <p className="rounded-lg border border-[#E4E9F2] bg-[#F8FAFD] px-3 py-2 text-sm text-[#4B5A72]">
          Continue to the dashboard with your configured account holder.
        </p>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="ca-button w-full"
        >
          {loading ? "Signing in..." : "Continue"}
        </button>

        <p className="text-center text-xs text-[#74839C]">
          Demo access is restricted to your configured account holder.
        </p>
      </form>
    </div>
  );
}

