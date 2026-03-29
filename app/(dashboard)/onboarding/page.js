"use client";

import { useEffect, useMemo, useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import Toast from "@/components/Toast";
import { useApiHistory } from "@/context/ApiHistoryContext";
import { useAuth } from "@/context/AuthContext";

const INDUSTRY_CODE_OPTIONS = [
  { value: "45391", label: "45391 - Home furnishing stores" },
  { value: "5734", label: "5734 - Computer software stores" },
  { value: "5812", label: "5812 - Eating places and restaurants" },
  { value: "5944", label: "5944 - Jewelry stores" },
];

const ONBOARDING_CAPABILITY_ORDER = [
  "issueCard",
  "useCard",
  "receiveFromBalanceAccount",
  "sendToBalanceAccount",
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

export default function OnboardingPage() {
  const { user } = useAuth();
  const { trackedFetch } = useApiHistory();
  const [businessLines, setBusinessLines] = useState([]);
  const [businessLinesLoading, setBusinessLinesLoading] = useState(true);
  const [businessLinesError, setBusinessLinesError] = useState("");
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({
    industryCode: "45391",
    webAddress: "",
    businessName: "",
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
    () => {
      const capabilityMap = user?.capabilities || {};

      return ONBOARDING_CAPABILITY_ORDER.filter((name) => capabilityMap[name]).map((name) => {
        const value = capabilityMap[name];
        return {
          name,
          // The source of truth is the Account Holder GET capability payload.
          allowed: value?.allowed === true ? "Yes" : "No",
          status: value?.allowed ? "allowed" : value?.verificationStatus || "pending",
          problems: value?.problems || [],
        };
      });
    },
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
    if (businessLines.length > 0) {
      setToast({ type: "error", message: "A business line already exists for this legal entity." });
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

  const ahReference = user?.email || "—";
  const allBalanceAccountIds = Array.isArray(user?.balanceAccounts)
    ? user.balanceAccounts.map((item) => item?.id).filter(Boolean)
    : [];
  const balanceAccountDisplay = allBalanceAccountIds.length
    ? allBalanceAccountIds.join(", ")
    : user?.balanceAccountId || "—";
  const canOfferCreation = !businessLinesLoading && !businessLinesError && businessLines.length === 0;
  const accountHolderStatus = user?.accountHolderStatus || "—";
  const isAccountHolderActive = String(accountHolderStatus).toLowerCase() === "active";
  const allCapabilitiesSatisfied = capabilities.length > 0 && capabilities.every((cap) => cap.allowed === "Yes");

  return (
    <div className="space-y-6">
      <section className="ca-panel">
        <h1 className="ca-title">Onboarding</h1>
        <p className="ca-muted mt-1 text-xs">
          Account holder status:{" "}
          <span className={`font-semibold ${isAccountHolderActive ? "text-green-600" : "text-red-600"}`}>
            {accountHolderStatus}
          </span>
        </p>
        <p className="ca-muted mt-1 text-xs">
          Legal entity ID: <span className="font-semibold text-[#364761]">{legalEntityId || "—"}</span>
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-[#E4E9F2] bg-[#FBFCFE] p-3 text-sm">
            <p className="text-xs uppercase tracking-wide text-[#6C7B96]">AH Reference (Email)</p>
            <p className="mt-1 break-all font-medium text-[#2E3D5B]">{ahReference}</p>
          </div>
          <div className="rounded-lg border border-[#E4E9F2] bg-[#FBFCFE] p-3 text-sm">
            <p className="text-xs uppercase tracking-wide text-[#6C7B96]">Account Holder ID</p>
            <p className="mt-1 break-all font-medium text-[#2E3D5B]">{user?.accountHolderId || "—"}</p>
          </div>
          <div className="rounded-lg border border-[#E4E9F2] bg-[#FBFCFE] p-3 text-sm md:col-span-2">
            <p className="text-xs uppercase tracking-wide text-[#6C7B96]">Balance Account ID(s)</p>
            <p className="mt-1 break-all font-medium text-[#2E3D5B]">{balanceAccountDisplay}</p>
          </div>
        </div>
      </section>

      <section className="ca-panel">
        <h2 className="ca-section-title mb-4">KYC Business Information</h2>
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
              onChange={(e) => setForm((s) => ({ ...s, industryCode: e.target.value }))}
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
              onChange={(e) => setForm((s) => ({ ...s, webAddress: e.target.value }))}
              className="ca-input"
              placeholder="Business Website"
              required
            />
            <input
              value={form.businessName}
              onChange={(e) => setForm((s) => ({ ...s, businessName: e.target.value }))}
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
            <p className="mt-2 max-w-2xl text-sm text-[#4E6187]">
              {allCapabilitiesSatisfied
                ? "Your required capabilities are already enabled. You can still reopen Adyen's hosted flow to review or update onboarding details."
                : "Open Adyen's hosted flow to submit verification details, add transfer instruments, and accept terms so your account can move toward fully enabled capabilities."}
            </p>
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
                  <th className="ca-th">Allowed</th>
                  <th className="ca-th">Status</th>
                </tr>
              </thead>
              <tbody>
                {capabilities.map((cap) => (
                  <tr key={cap.name} className="border-t border-[#EDF1F7] align-top">
                    <td className="ca-td font-medium">{cap.name}</td>
                    <td className="ca-td">{cap.allowed}</td>
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

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
