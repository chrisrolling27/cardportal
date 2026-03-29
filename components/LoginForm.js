"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApiHistory } from "@/context/ApiHistoryContext";
import { useAuth } from "@/context/AuthContext";

export default function LoginForm() {
  const router = useRouter();
  const { trackedFetch } = useApiHistory();
  const { setSession } = useAuth();
  const [loadingMode, setLoadingMode] = useState("");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [formStartedAt] = useState(() => Date.now());

  const onLoginWithEmail = async (event) => {
    event.preventDefault();
    if (loadingMode) return;
    setError("");
    setLoadingMode("email");
    try {
      const data = await trackedFetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          honeypot,
          formStartedAt,
        }),
      });
      setSession(data);
      router.push("/home");
    } catch (err) {
      setError(err.message || "Unable to log in.");
    } finally {
      setLoadingMode("");
    }
  };

  const onLoginWithKnownAh = async () => {
    if (loadingMode) return;
    setError("");
    setLoadingMode("known-ah");
    try {
      const data = await trackedFetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          useKnownAhBackdoor: true,
          honeypot,
          formStartedAt,
        }),
      });
      setSession(data);
      router.push("/home");
    } catch (err) {
      setError(err.message || "Unable to log in with KNOWN_AH.");
    } finally {
      setLoadingMode("");
    }
  };

  return (
    <div className="ca-surface w-full max-w-md p-7">
      <form className="space-y-4" onSubmit={onLoginWithEmail}>
        <p className="rounded-lg border border-[#E4E9F2] bg-[#F8FAFD] px-3 py-2 text-sm text-[#4B5A72]">
          Sign in with email. If no matching account holder reference is found, one will be provisioned automatically.
        </p>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="space-y-2">
          <label htmlFor="login-email" className="block text-xs font-semibold uppercase tracking-wide text-[#5C6B84]">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            className="ca-input w-full"
            placeholder="name@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
          className="hidden"
          aria-hidden="true"
        />

        <button
          type="submit"
          disabled={Boolean(loadingMode)}
          className="ca-button w-full"
        >
          {loadingMode === "email" ? "Signing in..." : "Continue"}
        </button>

        <button
          type="button"
          disabled={Boolean(loadingMode)}
          onClick={onLoginWithKnownAh}
          className="ca-button-dark w-full"
        >
          {loadingMode === "known-ah" ? "Signing in..." : "Use KNOWN_AH (fast)"}
        </button>

        <p className="text-center text-xs text-[#74839C]">
          KNOWN_AH backdoor remains available for fast demo access.
        </p>
      </form>
    </div>
  );
}

