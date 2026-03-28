"use client";

import { useEffect, useMemo, useState } from "react";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import Toast from "@/components/Toast";
import { useApiHistory } from "@/context/ApiHistoryContext";
import { useAuth } from "@/context/AuthContext";

export default function RegistrationPage() {
  const { user } = useAuth();
  const { trackedFetch } = useApiHistory();
  const [accountHolder, setAccountHolder] = useState(null);
  const [businessLines, setBusinessLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({
    industryCode: "7995",
    webAddress: "https://example.com",
    description: "Issuing Demo",
  });

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [overview, bl] = await Promise.all([
        trackedFetch("/api/adyen/account-overview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountHolderId: user.accountHolderId,
            balanceAccountId: user.balanceAccountId,
          }),
        }),
        trackedFetch(`/api/adyen/legal-entity/business-lines?legalEntityId=${user.legalEntityId}`),
      ]);
      setAccountHolder(overview.accountHolder);
      setBusinessLines(bl.businessLines || bl.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const capabilities = useMemo(
    () =>
      Object.entries(accountHolder?.capabilities || {}).map(([name, value]) => ({
        name,
        level: value?.requestedLevel || "—",
        status: value?.allowed ? "allowed" : value?.verificationStatus || "pending",
        problems: value?.problems || [],
      })),
    [accountHolder]
  );

  const launchHostedOnboarding = async () => {
    try {
      const data = await trackedFetch("/api/adyen/hosted-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ legalEntityId: user.legalEntityId }),
      });
      if (data.onboardingUrl) {
        window.open(data.onboardingUrl, "_blank", "noopener,noreferrer");
      } else {
        throw new Error("No onboarding URL returned by Adyen.");
      }
    } catch (err) {
      setToast({ type: "error", message: err.message });
    }
  };

  const createBusinessLine = async (event) => {
    event.preventDefault();
    try {
      await trackedFetch("/api/adyen/legal-entity/business-lines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          legalEntityId: user.legalEntityId,
          ...form,
        }),
      });
      setToast({ type: "success", message: "Business line created." });
      fetchData();
    } catch (err) {
      setToast({ type: "error", message: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-6 shadow-soft">
        <h1 className="text-2xl font-semibold">Capabilities & Onboarding</h1>
        <p className="mt-2 text-sm text-adyen-gray-600">
          Review current capability statuses and complete Adyen hosted verification.
        </p>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-soft">
        <h2 className="mb-4 text-lg font-semibold">Capabilities</h2>
        {loading ? (
          <LoadingSkeleton className="h-44 w-full" />
        ) : error ? (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
        ) : capabilities.length === 0 ? (
          <EmptyState title="No capabilities found" message="Account holder did not return capability data." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-adyen-gray-500">
                <tr>
                  <th className="pb-2">Capability</th>
                  <th className="pb-2">Requested Level</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {capabilities.map((cap) => (
                  <tr key={cap.name} className="border-t border-adyen-gray-100 align-top">
                    <td className="py-3 pr-3 font-medium">{cap.name}</td>
                    <td className="py-3 pr-3">{cap.level}</td>
                    <td className="py-3">
                      <StatusBadge status={cap.status} />
                      {cap.problems?.length ? (
                        <details className="mt-2 text-xs text-red-700">
                          <summary>Show problems</summary>
                          <pre className="mt-2 whitespace-pre-wrap rounded bg-red-50 p-2">
                            {JSON.stringify(cap.problems, null, 2)}
                          </pre>
                        </details>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-soft">
        <button
          type="button"
          onClick={launchHostedOnboarding}
          className="rounded-lg bg-adyen-black px-4 py-2 font-semibold text-white hover:bg-adyen-navy"
        >
          Launch Hosted Onboarding →
        </button>
        <p className="mt-2 text-sm text-adyen-gray-600">
          Complete KYC verification, add transfer instruments, and accept terms through Adyen&apos;s hosted flow.
        </p>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-soft">
        <h2 className="mb-4 text-lg font-semibold">Create Business Line</h2>
        <form onSubmit={createBusinessLine} className="grid gap-3 md:grid-cols-4">
          <input
            value={form.industryCode}
            onChange={(e) => setForm((s) => ({ ...s, industryCode: e.target.value }))}
            className="rounded-lg border border-adyen-gray-200 px-3 py-2"
            placeholder="Industry Code"
          />
          <input
            value={form.webAddress}
            onChange={(e) => setForm((s) => ({ ...s, webAddress: e.target.value }))}
            className="rounded-lg border border-adyen-gray-200 px-3 py-2"
            placeholder="Web Address"
          />
          <input
            value={form.description}
            onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
            className="rounded-lg border border-adyen-gray-200 px-3 py-2"
            placeholder="Source of Funds Description"
          />
          <button type="submit" className="rounded-lg bg-adyen-green px-4 py-2 font-semibold text-adyen-black">
            Submit
          </button>
        </form>

        <div className="mt-5 space-y-2">
          {businessLines.length ? (
            businessLines.map((line) => (
              <div key={line.id} className="rounded-lg border border-adyen-gray-100 p-3 text-sm">
                <p className="font-medium">{line.id}</p>
                <p className="text-adyen-gray-600">
                  {line.industryCode} • {line.webAddress || "—"}
                </p>
              </div>
            ))
          ) : (
            <EmptyState title="No business lines" message="Create your first business line above." />
          )}
        </div>
      </section>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

