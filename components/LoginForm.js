"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TIMEZONES } from "@/lib/constants";
import { useApiHistory } from "@/context/ApiHistoryContext";
import { useAuth } from "@/context/AuthContext";

export default function LoginForm() {
  const router = useRouter();
  const { trackedFetch } = useApiHistory();
  const { setSession } = useAuth();
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState("");
  const [form, setForm] = useState({
    email: "",
    companyName: "",
    timezone: "America/New_York",
  });

  const onLogin = async () => {
    const data = await trackedFetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email }),
    });
    setSession(data);
    router.push("/home");
  };

  const onRegister = async () => {
    setStep("Creating legal entity...");
    const data = await trackedFetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.email,
        companyName: form.companyName,
        timezone: form.timezone,
      }),
    });
    setSession(data);
    router.push("/home");
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await onLogin();
      } else {
        await onRegister();
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
      setStep("");
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-soft">
      <div className="mb-6 flex rounded-lg bg-adyen-gray-50 p-1">
        {["login", "register"].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setMode(item)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
              mode === item ? "bg-white text-adyen-black shadow-sm" : "text-adyen-gray-500"
            }`}
          >
            {item === "login" ? "Login" : "Register"}
          </button>
        ))}
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="mb-1 block text-sm font-medium text-adyen-black">Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
            className="w-full rounded-lg border border-adyen-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-adyen-green/40"
          />
        </div>

        {mode === "register" && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium text-adyen-black">Company Name</label>
              <input
                type="text"
                required
                value={form.companyName}
                onChange={(e) => setForm((s) => ({ ...s, companyName: e.target.value }))}
                className="w-full rounded-lg border border-adyen-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-adyen-green/40"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-adyen-black">Timezone</label>
              <select
                value={form.timezone}
                onChange={(e) => setForm((s) => ({ ...s, timezone: e.target.value }))}
                className="w-full rounded-lg border border-adyen-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-adyen-green/40"
              >
                {TIMEZONES.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {step && <p className="text-sm text-adyen-gray-700">{step}</p>}
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-adyen-green px-4 py-2 font-semibold text-adyen-black hover:bg-adyen-darkGreen disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
        </button>
      </form>
    </div>
  );
}

