"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import EmptyState from "@/components/EmptyState";
import StatusBadge from "@/components/StatusBadge";
import Toast, { useToast } from "@/components/Toast";
import { useApiHistory } from "@/context/ApiHistoryContext";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/lib/apiError";

const INDUSTRY_CODE_OPTIONS = [
  { value: "45391", label: "45391 - Home furnishing stores" },
  { value: "5734", label: "5734 - Computer software stores" },
  { value: "5812", label: "5812 - Eating places and restaurants" },
  { value: "5944", label: "5944 - Jewelry stores" },
];

const ONBOARDING_CAPABILITY_ORDER = [
  "issueCard",
  "useCard",
  "receiveFromTransferInstrument",
  "sendToTransferInstrument",
];

function industryLabelFromCode(industryCode) {
  if (!industryCode) return "—";
  const matched = INDUSTRY_CODE_OPTIONS.find((option) => option.value === String(industryCode));
  return matched?.label || `${industryCode} - Unmapped MCC`;
}

function webAddressesFromBusinessLine(line) {
  const fromWebData = Array.isArray(line?.webData) ? line.webData.map((item) => item?.webAddress).filter(Boolean) : [];
  if (fromWebData.length) return fromWebData.join(", ");
  return line?.webAddress || "—";
}

export default function OnboardingContent() {
  const { user } = useAuth();
  const { trackedFetch } = useApiHistory();
  const { toast, clearToast, showError, showSuccess } = useToast();
  const [businessLines, setBusinessLines] = useState([]);
  const [businessLinesLoading, setBusinessLinesLoading] = useState(true);
  const [businessLinesError, setBusinessLinesError] = useState("");
  const [form, setForm] = useState({
    industryCode: "45391",
    webAddress: "",
    businessName: user?.companyName || "",
  });
  const legalEntityId = user?.legalEntityId || "";

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      businessName: prev.businessName || user?.companyName || "",
    }));
  }, [user?.companyName]);

  const fetchData = useCallback(async () => {
    if (!legalEntityId) {
      setBusinessLines([]);
      setBusinessLinesLoading(false);
      setBusinessLinesError("No legal entity found in the current session.");
      return;
    }

    setBusinessLinesLoading(true);
    setBusinessLinesError("");
    try {
      const payload = await trackedFetch(
        `/api/adyen/legal-entity/business-lines?legalEntityId=${encodeURIComponent(legalEntityId)}`
      );
      const list = payload?.businessLines || payload?.data || [];
      setBusinessLines(Array.isArray(list) ? list : []);
    } catch (error) {
      const message = getApiErrorMessage(error);
      setBusinessLines([]);
      setBusinessLinesError(message);
    } finally {
      setBusinessLinesLoading(false);
    }
  }, [legalEntityId, trackedFetch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const capabilities = useMemo(() => {
    const capabilityMap = user?.capabilities || {};
    return ONBOARDING_CAPABILITY_ORDER.filter((name) => capabilityMap[name]).map((name) => {
      const value = capabilityMap[name];
      return {
        name,
        allowed: value?.allowed === true ? "Yes" : "No",
        status: value?.allowed ? "allowed" : value?.verificationStatus || "pending",
        problems: value?.problems || [],
      };
    });
  }, [user?.capabilities]);

  const launchHostedOnboarding = async () => {
    if (!legalEntityId) {
      showError("Missing legal entity in session data.");
      return;
    }

    try {
      const data = await trackedFetch("/api/adyen/hosted-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ legalEntityId }),
      });
      if (data?.onboardingUrl) {
        window.open(data.onboardingUrl, "_blank", "noopener,noreferrer");
      } else {
        throw new Error("No onboarding URL returned by Adyen.");
      }
    } catch (error) {
      showError(getApiErrorMessage(error) || "Unable to launch hosted onboarding.");
    }
  };

  const createBusinessLine = async (event) => {
    event.preventDefault();
    if (!legalEntityId) {
      showError("Missing legal entity in session data.");
      return;
    }
    if (businessLines.length > 0) {
      showError("A business line already exists for this legal entity.");
      return;
    }

    try {
      await trackedFetch("/api/adyen/legal-entity/business-lines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          legalEntityId,
          industryCode: form.industryCode,
          webAddress: form.webAddress,
          businessName: form.businessName,
        }),
      });
      showSuccess("Business line created.");
      await fetchData();
    } catch (error) {
      const message = getApiErrorMessage(error) || "Failed to create business line.";
      showError(message);
    }
  };

  const email = user?.email || "—";
  const primaryBalanceAccountId = user?.balanceAccountId || "—";
  const canOfferCreation = !businessLinesLoading && !businessLinesError && businessLines.length === 0;
  const accountHolderStatus = user?.accountHolderStatus || "—";
  const isAccountHolderActive = String(accountHolderStatus).toLowerCase() === "active";
  const allCapabilitiesSatisfied = capabilities.length > 0 && capabilities.every((cap) => cap.allowed === "Yes");

  return (
    <div className="space-y-6">
      <section className="ca-panel">
        <h2 className="ca-section-title">Account Holder</h2>
        <ul className="mt-4 space-y-2 text-sm text-[#2E3D5B]">
          <li>
            <span className="font-semibold">Email:</span> <span className="break-all">{email}</span>
          </li>
          <li>
            <span className="font-semibold">Status:</span>{" "}
            <span className={isAccountHolderActive ? "text-green-600" : "text-red-600"}>{accountHolderStatus}</span>
          </li>
          <li>
            <span className="font-semibold">Account Holder:</span>{" "}
            <span className="break-all">{user?.accountHolderId || "—"}</span>
          </li>
          <li>
            <span className="font-semibold">Legal Entity:</span> <span className="break-all">{legalEntityId || "—"}</span>
          </li>
          <li>
            <span className="font-semibold">Balance Account:</span>{" "}
            <span className="break-all">{primaryBalanceAccountId}</span>
          </li>
        </ul>
      </section>

      <section className="ca-panel">
        <h2 className="ca-section-title mb-4">Business Line</h2>
        {businessLinesError ? (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <p>{businessLinesError}</p>
            <button type="button" onClick={fetchData} className="ca-button mt-3">
              Retry lookup
            </button>
          </div>
        ) : null}

        {canOfferCreation ? (
          <form onSubmit={createBusinessLine} className="grid gap-3 md:grid-cols-4">
            <select
              value={form.industryCode}
              onChange={(event) => setForm((prev) => ({ ...prev, industryCode: event.target.value }))}
              className="ca-input"
            >
              {INDUSTRY_CODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              type="url"
              value={form.webAddress}
              onChange={(event) => setForm((prev) => ({ ...prev, webAddress: event.target.value }))}
              className="ca-input"
              placeholder="Business Website"
              required
            />
            <input
              value={form.businessName}
              onChange={(event) => setForm((prev) => ({ ...prev, businessName: event.target.value }))}
              className="ca-input"
              placeholder="Business Name"
              required
            />
            <button type="submit" className="ca-button">
              Create Business Line
            </button>
          </form>
        ) : null}

        <div className="mt-5 space-y-2">
          {businessLinesLoading ? (
            <p className="text-sm text-[#5C6B84]">Loading business lines...</p>
          ) : businessLines.length ? (
            businessLines.map((line) => (
              <div key={line.id} className="rounded-lg border border-[#E4E9F2] bg-[#FBFCFE] p-3 text-sm">
                <p className="font-medium text-[#2E3D5B]">{line.id}</p>
                <p className="mt-1 text-[#5C6B84]">
                  Industry (MCC): <span className="font-medium text-[#364761]">{industryLabelFromCode(line.industryCode)}</span>
                </p>
                <p className="mt-1 text-[#5C6B84]">
                  Website: <span className="font-medium text-[#364761]">{webAddressesFromBusinessLine(line)}</span>
                </p>
              </div>
            ))
          ) : (
            <EmptyState
              title="No business lines"
              message={
                businessLinesError
                  ? "Fix the lookup issue before creating a business line."
                  : "No existing business line found for this legal entity."
              }
            />
          )}
        </div>
      </section>

      <section
        className={`ca-panel overflow-hidden shadow-sm ${
          allCapabilitiesSatisfied
            ? "border-[#D6DEEE] bg-gradient-to-br from-[#F4F7FD] via-[#EEF2FA] to-white"
            : "border-[#BFD2FF] bg-gradient-to-br from-[#EEF4FF] via-[#E6EEFF] to-white"
        }`}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            {allCapabilitiesSatisfied ? (
              <p className="inline-flex rounded-full border border-[#D6DEEE] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#43516B]">
                Completed
              </p>
            ) : (
              <p className="inline-flex rounded-full border border-[#D5E2FF] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#3957A5]">
                Next step
              </p>
            )}
            <h2 className="mt-3 text-2xl font-semibold text-[#1E3058]">
              {allCapabilitiesSatisfied ? "Hosted Onboarding Complete" : "Complete Hosted Onboarding"}
            </h2>
            {!allCapabilitiesSatisfied ? (
              <p className="mt-2 max-w-2xl text-sm text-[#4E6187]">
                Open Adyen's hosted flow to submit verification details, add transfer instruments, and accept terms so
                your account can move toward fully enabled capabilities.
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={launchHostedOnboarding}
            className="ca-button-dark h-12 w-full px-6 text-base font-semibold shadow md:w-auto"
          >
            {allCapabilitiesSatisfied ? "Reopen Hosted Onboarding" : "Launch Hosted Onboarding"}
          </button>
        </div>
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
                  <th className="ca-th">Function</th>
                  <th className="ca-th">Status</th>
                </tr>
              </thead>
              <tbody>
                {capabilities.map((capability) => (
                  <tr key={capability.name} className="border-t border-[#EDF1F7] align-top">
                    <td className="ca-td font-medium">{capability.name}</td>
                    <td className="ca-td">
                      <StatusBadge status={capability.status} />
                      {capability.problems?.length ? (
                        <details className="mt-2 text-xs text-red-700">
                          <summary>Show problems</summary>
                          <pre className="mt-2 whitespace-pre-wrap rounded bg-red-50 p-2">
                            {JSON.stringify(capability.problems, null, 2)}
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

      <Toast toast={toast} onClose={clearToast} />
    </div>
  );
}
