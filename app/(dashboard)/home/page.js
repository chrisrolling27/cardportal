"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdyenComponentMount from "@/components/AdyenComponentMount";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import Toast from "@/components/Toast";
import { useApiHistory } from "@/context/ApiHistoryContext";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/lib/utils";

const TRANSFER_AMOUNT_MINOR = 100000; // $1000.00
const TRANSFER_THRESHOLD_MINOR = 99999; // $999.99
const OVERVIEW_REFRESH_MS = 10000;

function greetingByHour() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const { user } = useAuth();
  const { trackedFetch } = useApiHistory();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transferLoading, setTransferLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState("");
  const hasLoadedOnceRef = useRef(false);

  const loadOverview = useCallback(async () => {
    try {
      const data = await trackedFetch(
        `/api/adyen/account-overview?balanceAccountId=${encodeURIComponent(user.balanceAccountId)}`
      );
      setOverview(data);
      setError("");
      hasLoadedOnceRef.current = true;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [trackedFetch, user.balanceAccountId]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    if (!user.balanceAccountId) return undefined;

    const interval = setInterval(() => {
      loadOverview();
    }, OVERVIEW_REFRESH_MS);

    const refreshOnForeground = () => {
      if (document.visibilityState === "visible") loadOverview();
    };

    window.addEventListener("focus", refreshOnForeground);
    document.addEventListener("visibilitychange", refreshOnForeground);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", refreshOnForeground);
      document.removeEventListener("visibilitychange", refreshOnForeground);
    };
  }, [loadOverview, user.balanceAccountId]);

  const balances = useMemo(() => {
    const items = overview?.balanceAccount?.balances || [];
    const usd =
      items.find((item) => (item?.currency || item?.available?.currency || item?.balance?.currency) === "USD") ||
      items[0];

    // Adyen may return scalar minor units (available: 200000) or nested objects ({ available: { value, currency } }).
    const availableValue =
      typeof usd?.available === "number" ? usd.available : Number(usd?.available?.value || usd?.balance?.value || 0);
    const pendingValue =
      typeof usd?.pending === "number" ? usd.pending : Number(usd?.pending?.value || usd?.reserved?.value || 0);
    const currencyCode = usd?.currency || usd?.available?.currency || usd?.balance?.currency || "USD";

    return {
      available: Number.isFinite(availableValue) ? availableValue : 0,
      pending: Number.isFinite(pendingValue) ? pendingValue : 0,
      currency: currencyCode,
    };
  }, [overview]);

  const showTransferButton = !loading && !error && balances.currency === "USD" && balances.available < TRANSFER_THRESHOLD_MINOR;
  const progressToReady = Math.max(0, Math.min(100, Math.round((balances.available / TRANSFER_AMOUNT_MINOR) * 100)));
  const portalStatusLabel =
    loading && !hasLoadedOnceRef.current
      ? "Syncing your balance..."
      : error
        ? "Connection interrupted"
        : showTransferButton
          ? "Low balance detected"
          : "Balance looks healthy";

  const transferFunds = async () => {
    try {
      setTransferLoading(true);
      await trackedFetch("/api/adyen/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinationBalanceAccountId: user.balanceAccountId,
          amountValue: TRANSFER_AMOUNT_MINOR,
          currency: "USD",
          referenceForBeneficiary: "FundsForYourBalanceAccount",
          description: `Top up ${user.balanceAccountId} from SPECIAL_BA`,
        }),
      });
      setToast({ type: "success", message: "Transferred $1,000 successfully." });
      await loadOverview();
    } catch (err) {
      setToast({ type: "error", message: err.message || "Failed to transfer funds." });
    } finally {
      setTransferLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="overflow-hidden rounded-2xl border border-[#D8DFEA] bg-gradient-to-br from-[#EEF4FF] via-white to-[#E8FFF8] p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#5E6FA8]">Portal</p>
            <h1 className="mt-2 text-3xl font-bold tracking-[-0.02em] text-[#0B1222] md:text-4xl">
              {greetingByHour()}. Ready to power up your balance?
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-[#4E607C] md:text-base">
              Keep funds flowing. Boost your balance instantly and track activity in real time.
            </p>
          </div>
          <div className="w-full rounded-2xl border border-[#DCE4F2] bg-white/90 p-5 shadow-sm lg:max-w-md">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#70819D]">Balance Quest</p>
            <p className="mt-2 text-sm font-medium text-[#2D3D5E]">{portalStatusLabel}</p>
            <div className="mt-4">
              {loading && !hasLoadedOnceRef.current ? (
                <LoadingSkeleton className="h-11 w-44" />
              ) : error ? (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
              ) : (
                <>
                  <p className="text-4xl font-bold tracking-[-0.01em] text-[#0B1222] md:text-5xl">
                    {formatCurrency(balances.available, balances.currency)} {balances.currency}
                  </p>
                  <p className="mt-2 text-sm text-[#5C6B84]">Pending: {formatCurrency(balances.pending, balances.currency)}</p>
                </>
              )}
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.06em] text-[#70819D]">
                <span>Fuel meter</span>
                <span>{progressToReady}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-[#E5ECFA]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#4F46E5] via-[#2A8BF2] to-[#17B67A] transition-all"
                  style={{ width: `${progressToReady}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#101E3C] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#162B56] disabled:cursor-not-allowed disabled:bg-[#8A96AD]"
              onClick={transferFunds}
              disabled={transferLoading || loading || !!error || balances.currency !== "USD"}
            >
              {transferLoading ? "Adding funds..." : "Add $1,000 Boost"}
            </button>
            {showTransferButton ? (
              <p className="mt-2 text-xs text-[#4E607C]">Tip: You are below the recommended minimum. Boost now to stay ready.</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="ca-panel-tight">
        <h2 className="ca-section-title mb-3">Transactions Overview</h2>
        <AdyenComponentMount
          componentName="TransactionsOverview"
          accountHolderId={user.accountHolderId}
          roles={["Transactions Overview Component: View"]}
        />
      </section>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

