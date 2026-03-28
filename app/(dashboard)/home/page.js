"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdyenComponentMount from "@/components/AdyenComponentMount";
import CopyButton from "@/components/CopyButton";
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
      const data = await trackedFetch("/api/adyen/account-overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountHolderId: user.accountHolderId,
          balanceAccountId: user.balanceAccountId,
        }),
      });
      setOverview(data);
      setError("");
      hasLoadedOnceRef.current = true;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [trackedFetch, user.accountHolderId, user.balanceAccountId]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    if (!user.accountHolderId || !user.balanceAccountId) return undefined;

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
  }, [loadOverview, user.accountHolderId, user.balanceAccountId]);

  const balances = useMemo(() => {
    const items = overview?.balanceAccount?.balances || [];
    const usd = items.find((item) => item?.balance?.currency === "USD") || items[0];
    return {
      available: usd?.available?.value || 0,
      pending: usd?.pending?.value || 0,
      currency: usd?.available?.currency || "USD",
    };
  }, [overview]);

  const showTransferButton = !loading && !error && balances.currency === "USD" && balances.available < TRANSFER_THRESHOLD_MINOR;

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
    <div className="space-y-6">
      <section className="rounded-xl bg-gradient-to-r from-[#0F1D3D] via-[#17305D] to-[#145B48] p-6 text-white shadow-sm">
        <h1 className="text-[30px] font-semibold tracking-[-0.01em]">
          {greetingByHour()}, {user.companyName}
        </h1>
        <p className="mt-1 text-sm text-white/80">Here&apos;s your account overview from KNOWN_AH.</p>
      </section>

      <section className="ca-panel">
        {loading && !hasLoadedOnceRef.current ? (
          <LoadingSkeleton className="h-36 w-full" />
        ) : error ? (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.05em] text-[#70819D]">Available Balance</p>
            <p className="mt-2 text-4xl font-bold text-[#0B1222]">
              {formatCurrency(balances.available, balances.currency)} {balances.currency}
            </p>
            <p className="mt-2 text-sm text-[#5C6B84]">
              Pending: {formatCurrency(balances.pending, balances.currency)}
            </p>
            {showTransferButton ? (
              <div className="mt-4">
                <button type="button" className="ca-button-dark" onClick={transferFunds} disabled={transferLoading}>
                  {transferLoading ? "Transferring..." : "Transfer $1,000"}
                </button>
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-3 text-xs">
              <div className="rounded-full border border-[#D8DFEA] bg-[#F8FAFD] px-3 py-2">
                AH: {user.accountHolderId} <CopyButton label="Copy" value={user.accountHolderId} />
              </div>
              <div className="rounded-full border border-[#D8DFEA] bg-[#F8FAFD] px-3 py-2">
                BA: {user.balanceAccountId} <CopyButton label="Copy" value={user.balanceAccountId} />
              </div>
            </div>
          </>
        )}
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

