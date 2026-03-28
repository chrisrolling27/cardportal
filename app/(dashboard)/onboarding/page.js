"use client";

import { useEffect, useMemo, useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import Toast from "@/components/Toast";
import { useApiHistory } from "@/context/ApiHistoryContext";
import { useAuth } from "@/context/AuthContext";

export default function OnboardingPage() {
  const { user } = useAuth();
  const { trackedFetch } = useApiHistory();
  const [businessLines, setBusinessLines] = useState([]);
  const [businessLinesLoading, setBusinessLinesLoading] = useState(true);
  const [businessLinesError, setBusinessLinesError] = useState("");
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({
    industryCode: "7995",
    webAddress: "https://example.com",
    description: "Issuing Demo",
  });
  const legalEntityId = user?.legalEntityId || "";

  const fetchData = async () => {
    if (!legalEntityId) {
      setBusinessLines([]);
      setBusinessLinesLoading(false);
      setBusinessLinesError("No legal entity found in the current session.");
      return;
    }

    setBusinessLinesLoading(true);
    setBusinessLinesError("");
    try {
      const bl = await trackedFetch(
        `/api/adyen/legal-entity/business-lines?legalEntityId=${encodeURIComponent(legalEntityId)}`
      );
      setBusinessLines(bl.businessLines || bl.data || []);
    } catch (err) {
      setBusinessLinesError(err.message);
    } finally {
      setBusinessLinesLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legalEntityId]);

  const capabilities = useMemo(
    () =>
      Object.entries(user?.capabilities || {}).map(([name, value]) => ({
        name,
        level: value?.requestedLevel || "—",
        status: value?.allowed ? "allowed" : value?.verificationStatus || "pending",
        problems: value?.problems || [],
      })),
    [user?.capabilities]
  );

  const launchHostedOnboarding = async () => {
    if (!legalEntityId) {
      setToast({ type: "error", message: "Missing legal entity in session data." });
      return;
    }

    try {
      const data = await trackedFetch("/api/adyen/hosted-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ legalEntityId }),
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
    if (!legalEntityId) {
      setToast({ type: "error", message: "Missing legal entity in session data." });
      return;
    }

    try {
      await trackedFetch("/api/adyen/legal-entity/business-lines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          legalEntityId,
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
      <section className="ca-panel">
        <h1 className="ca-title">Capabilities & Onboarding</h1>
        <p className="ca-muted mt-2">
          Capabilities are sourced from the current KNOWN_AH login session.
        </p>
        <p className="ca-muted mt-1 text-xs">
          Account holder status: <span className="font-semibold text-[#364761]">{user.accountHolderStatus || "—"}</span>
        </p>
        <p className="ca-muted mt-1 text-xs">
          Legal entity ID: <span className="font-semibold text-[#364761]">{legalEntityId || "—"}</span>
        </p>
      </section>

      <section className="ca-panel">
        <h2 className="ca-section-title mb-4">Capabilities</h2>
        {capabilities.length === 0 ? (
          <EmptyState title="No capabilities found" message="Login session did not include capability data." />
        ) : (
          <div className="overflow-x-auto">
            <table className="ca-table">
              <thead>
                <tr>
                  <th className="ca-th">Capability</th>
                  <th className="ca-th">Requested Level</th>
                  <th className="ca-th">Status</th>
                </tr>
              </thead>
              <tbody>
                {capabilities.map((cap) => (
                  <tr key={cap.name} className="border-t border-[#EDF1F7] align-top">
                    <td className="ca-td font-medium">{cap.name}</td>
                    <td className="ca-td">{cap.level}</td>
                    <td className="ca-td">
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

      <section className="ca-panel">
        <button
          type="button"
          onClick={launchHostedOnboarding}
          className="ca-button-dark"
        >
          Launch Hosted Onboarding →
        </button>
        <p className="ca-muted mt-2">
          Complete KYC verification, add transfer instruments, and accept terms through Adyen&apos;s hosted flow.
        </p>
      </section>

      <section className="ca-panel">
        <h2 className="ca-section-title mb-4">Create Business Line</h2>
        {businessLinesError ? (
          <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{businessLinesError}</p>
        ) : null}
        <form onSubmit={createBusinessLine} className="grid gap-3 md:grid-cols-4">
          <input
            value={form.industryCode}
            onChange={(e) => setForm((s) => ({ ...s, industryCode: e.target.value }))}
            className="ca-input"
            placeholder="Industry Code"
          />
          <input
            value={form.webAddress}
            onChange={(e) => setForm((s) => ({ ...s, webAddress: e.target.value }))}
            className="ca-input"
            placeholder="Web Address"
          />
          <input
            value={form.description}
            onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
            className="ca-input"
            placeholder="Source of Funds Description"
          />
          <button type="submit" className="ca-button">
            Submit
          </button>
        </form>

        <div className="mt-5 space-y-2">
          {businessLinesLoading ? (
            <p className="text-sm text-[#5C6B84]">Loading business lines...</p>
          ) : businessLines.length ? (
            businessLines.map((line) => (
              <div key={line.id} className="rounded-lg border border-[#E4E9F2] bg-[#FBFCFE] p-3 text-sm">
                <p className="font-medium">{line.id}</p>
                <p className="text-[#5C6B84]">
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
