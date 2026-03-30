"use client";

import { useCallback, useEffect, useState } from "react";
import Toast, { useToast } from "@/components/Toast";
import { useApiHistory } from "@/context/ApiHistoryContext";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/lib/apiError";

export default function OnboardingContent() {
  const { user } = useAuth();
  const { trackedFetch } = useApiHistory();
  const { toast, clearToast, showError, showSuccess } = useToast();
  const [businessLines, setBusinessLines] = useState([]);
  const [loadingLines, setLoadingLines] = useState(true);
  const [linesError, setLinesError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({
    businessName: user?.companyName || "Business",
    industryCode: "6012",
    webAddress: "https://example.com",
  });

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      businessName: user?.companyName || prev.businessName,
    }));
  }, [user?.companyName]);

  const loadBusinessLines = useCallback(async () => {
    if (!user?.legalEntityId) {
      setBusinessLines([]);
      setLinesError("Missing legal entity ID in session.");
      setLoadingLines(false);
      return;
    }

    setLoadingLines(true);
    setLinesError("");
    try {
      const payload = await trackedFetch(`/api/adyen/legal-entity/business-lines?legalEntityId=${user.legalEntityId}`);
      const list = payload?.businessLines || payload?.data || [];
      setBusinessLines(Array.isArray(list) ? list : []);
    } catch (error) {
      const message = getApiErrorMessage(error);
      setBusinessLines([]);
      setLinesError(message);
      showError(message);
    } finally {
      setLoadingLines(false);
    }
  }, [showError, trackedFetch, user?.legalEntityId]);

  useEffect(() => {
    loadBusinessLines();
  }, [loadBusinessLines]);

  const createBusinessLine = async (event) => {
    event.preventDefault();
    if (!user?.legalEntityId) {
      showError("Missing legal entity ID in session.");
      return;
    }

    try {
      setIsCreating(true);
      setLinesError("");
      await trackedFetch("/api/adyen/legal-entity/business-lines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          legalEntityId: user.legalEntityId,
          industryCode: form.industryCode,
          webAddress: form.webAddress,
          businessName: form.businessName,
        }),
      });
      showSuccess("Business line created.");
      await loadBusinessLines();
    } catch (error) {
      const message = getApiErrorMessage(error) || "Failed to create business line.";
      setLinesError(message);
      showError(message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="ca-panel">
        <h2 className="ca-section-title">Create business line</h2>
        <form onSubmit={createBusinessLine} className="mt-4 grid gap-3 md:max-w-lg">
          <label className="text-xs font-medium text-[#3B4556]">Business name</label>
          <input
            className="ca-input"
            value={form.businessName}
            onChange={(event) => setForm((prev) => ({ ...prev, businessName: event.target.value }))}
            disabled={isCreating}
            required
          />

          <label className="text-xs font-medium text-[#3B4556]">Industry code</label>
          <input
            className="ca-input"
            value={form.industryCode}
            onChange={(event) => setForm((prev) => ({ ...prev, industryCode: event.target.value }))}
            disabled={isCreating}
            required
          />

          <label className="text-xs font-medium text-[#3B4556]">Website</label>
          <input
            type="url"
            className="ca-input"
            value={form.webAddress}
            onChange={(event) => setForm((prev) => ({ ...prev, webAddress: event.target.value }))}
            disabled={isCreating}
            required
          />

          <button type="submit" className="ca-button-dark h-10 w-full" disabled={isCreating}>
            {isCreating ? "Creating..." : "Create business line"}
          </button>
        </form>
      </section>

      <section className="ca-panel">
        <div className="flex items-center justify-between gap-3">
          <h2 className="ca-section-title">Business lines</h2>
          <button type="button" className="ca-button-secondary h-9" onClick={loadBusinessLines} disabled={loadingLines}>
            Refresh
          </button>
        </div>

        {loadingLines ? <p className="ca-muted mt-3 text-sm">Loading business lines...</p> : null}
        {linesError ? <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{linesError}</p> : null}
        {!loadingLines && !linesError && businessLines.length === 0 ? (
          <p className="ca-muted mt-3 text-sm">No business lines created yet.</p>
        ) : null}
        {!loadingLines && businessLines.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {businessLines.map((line, index) => (
              <li
                key={line?.id || `business-line-${index}`}
                className="rounded-lg border border-[#E4E9F2] bg-[#FBFCFE] px-3 py-2 text-sm"
              >
                <p className="font-medium text-[#00112C]">{line?.id || "Business line"}</p>
                <p className="mt-1 text-xs text-[#5C6B84]">
                  Industry: {line?.industryCode || "—"} · Service: {line?.service || "issuing"}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <Toast toast={toast} onClose={clearToast} />
    </div>
  );
}
