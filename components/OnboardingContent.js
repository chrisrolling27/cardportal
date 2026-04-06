"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
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

/** Human-readable labels from Adyen capability `problems` (strings, verificationErrors, or generic objects). */
function labelsFromCapabilityProblems(problems) {
  if (!Array.isArray(problems) || !problems.length) return [];
  const labels = [];
  for (const p of problems) {
    if (p == null) continue;
    if (typeof p === "string") {
      const t = p.trim();
      if (t) labels.push(t);
      continue;
    }
    if (typeof p !== "object") continue;
    const errs = p.verificationErrors;
    if (Array.isArray(errs) && errs.length) {
      for (const e of errs) {
        if (e && typeof e === "object") {
          const msg = typeof e.message === "string" ? e.message.trim() : "";
          const code = e.code != null ? String(e.code) : "";
          const typ = e.type != null ? String(e.type) : "";
          if (msg) labels.push(code ? `${msg} (${code})` : msg);
          else if (typ || code) labels.push([typ, code].filter(Boolean).join(" · "));
        } else if (typeof e === "string" && e.trim()) labels.push(e.trim());
      }
      continue;
    }
    if (typeof p.message === "string" && p.message.trim()) {
      labels.push(p.message.trim());
      continue;
    }
    const typePart = p.type != null ? String(p.type) : "";
    const codePart = p.code != null ? String(p.code) : "";
    if (typePart || codePart) {
      labels.push([typePart, codePart].filter(Boolean).join(" · "));
      continue;
    }
    if (p.entity?.type) {
      const id = p.entity.id ? String(p.entity.id) : "";
      labels.push(id ? `${p.entity.type} (${id})` : String(p.entity.type));
      continue;
    }
    let raw;
    try {
      raw = JSON.stringify(p);
    } catch {
      raw = String(p);
    }
    labels.push(raw);
  }
  const seen = new Set();
  return labels.filter((label) => {
    const key = label.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function CapabilityIssueBadges({ labels }) {
  if (!labels?.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {labels.map((label, index) => {
        const display = label.length > 120 ? `${label.slice(0, 117)}…` : label;
        return (
          <span
            key={`${index}-${label.slice(0, 32)}`}
            title={label.length > 48 ? label : undefined}
            className="inline-flex max-w-[min(100%,18rem)] truncate rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-medium leading-tight text-red-800"
          >
            {display}
          </span>
        );
      })}
    </div>
  );
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
  const [expandedCapabilityName, setExpandedCapabilityName] = useState(null);
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
      const problems = value?.problems || [];
      return {
        name,
        allowed: value?.allowed === true ? "Yes" : "No",
        status: value?.allowed ? "allowed" : value?.verificationStatus || "pending",
        problems,
        issueLabels: labelsFromCapabilityProblems(problems),
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
      showError("Business information has already been added for this legal entity.");
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
      showSuccess("Business information saved.");
      await fetchData();
    } catch (error) {
      const message = getApiErrorMessage(error) || "Failed to save business information.";
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
        <h2 className="ca-section-title mb-4">Business Information</h2>
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
            <div className="flex flex-col gap-1">
              <label htmlFor="onboarding-business-name" className="text-xs font-medium text-[#3B4556]">
                Name
              </label>
              <input
                id="onboarding-business-name"
                value={form.businessName}
                onChange={(event) => setForm((prev) => ({ ...prev, businessName: event.target.value }))}
                className="ca-input"
                placeholder="Acme Corp"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="onboarding-business-website" className="text-xs font-medium text-[#3B4556]">
                Website
              </label>
              <input
                id="onboarding-business-website"
                type="url"
                value={form.webAddress}
                onChange={(event) => setForm((prev) => ({ ...prev, webAddress: event.target.value }))}
                className="ca-input"
                placeholder="https://example.com"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="onboarding-industry" className="text-xs font-medium text-[#3B4556]">
                Industry
              </label>
              <select
                id="onboarding-industry"
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
            </div>
            <div className="flex flex-col gap-1 md:justify-end">
              <span className="hidden text-xs font-medium text-[#3B4556] md:block md:invisible" aria-hidden>
                Save
              </span>
              <button type="submit" className="ca-button">
                Save business information
              </button>
            </div>
          </form>
        ) : null}

        <div className="mt-5 space-y-2">
          {businessLinesLoading ? (
            <p className="text-sm text-[#5C6B84]">Loading business information…</p>
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
              title="No business information yet"
              message={
                businessLinesError
                  ? "Fix the lookup issue before you can add business information."
                  : "Add your business name, website, and industry to continue."
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
          <>
            <div className="overflow-x-auto">
              <table className="ca-table">
                <thead>
                  <tr>
                    <th className="ca-th">Function</th>
                    <th className="ca-th">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {capabilities.map((capability) => {
                    const hasFailureDetail =
                      capability.issueLabels.length > 0 ||
                      (Array.isArray(capability.problems) && capability.problems.length > 0);
                    const isExpanded = expandedCapabilityName === capability.name;
                    const failureCount =
                      capability.issueLabels.length ||
                      (Array.isArray(capability.problems) ? capability.problems.length : 0);
                    const panelId = `onboarding-cap-failures-${capability.name}`;
                    return (
                      <tr key={capability.name} className="border-t border-[#EDF1F7] align-top">
                        <td className="ca-td font-medium">{capability.name}</td>
                        <td className="ca-td">
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusBadge status={capability.status} />
                              {hasFailureDetail ? (
                                <button
                                  type="button"
                                  id={`${panelId}-trigger`}
                                  className="inline-flex items-center gap-1 rounded-md text-left text-xs font-semibold text-[#3957A5] outline-none ring-[#3957A5] ring-offset-2 focus-visible:ring-2"
                                  aria-expanded={isExpanded}
                                  aria-controls={panelId}
                                  onClick={() =>
                                    setExpandedCapabilityName((current) =>
                                      current === capability.name ? null : capability.name
                                    )
                                  }
                                >
                                  <ChevronRight
                                    className={`h-4 w-4 shrink-0 text-[#4E6187] transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                                    aria-hidden
                                  />
                                  Failures
                                  {failureCount ? (
                                    <span className="font-normal text-[#5C6B84]">({failureCount})</span>
                                  ) : null}
                                </button>
                              ) : null}
                            </div>
                            {isExpanded && hasFailureDetail ? (
                              <div
                                id={panelId}
                                role="region"
                                aria-labelledby={`${panelId}-trigger`}
                                className="rounded-md border border-[#F0D5D5] bg-red-50/40 p-2.5"
                              >
                                <CapabilityIssueBadges labels={capability.issueLabels} />
                                {capability.problems?.length && !capability.issueLabels.length ? (
                                  <pre className="mt-2 whitespace-pre-wrap rounded bg-red-50 p-2 text-xs text-red-800">
                                    {JSON.stringify(capability.problems, null, 2)}
                                  </pre>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <Toast toast={toast} onClose={clearToast} />
    </div>
  );
}
