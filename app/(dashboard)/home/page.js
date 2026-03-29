"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdyenComponentMount from "@/components/AdyenComponentMount";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import MainAccountTransfer from "@/components/MainAccountTransfer";
import Toast from "@/components/Toast";
import { useApiHistory } from "@/context/ApiHistoryContext";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/lib/utils";

const OVERVIEW_REFRESH_MS = 10000;

export default function HomePage() {
  const { user } = useAuth();
  const { trackedFetch } = useApiHistory();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
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

  return (
    <div className="space-y-6">
      <section className="ca-panel-tight">
        <h1 className="ca-title">Account</h1>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="ca-panel">
          {loading && !hasLoadedOnceRef.current ? (
            <div className="space-y-3">
              <LoadingSkeleton className="h-8 w-64" />
              <LoadingSkeleton className="h-20 w-full" />
            </div>
          ) : error ? (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <p>{error}</p>
            </div>
          ) : (
            <div className="grid gap-3">
              <div className="rounded-xl border border-[#E4E9F2] bg-[#FBFCFE] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#70819D]">Balance account available</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.01em] text-[#0B1222]">
                  {formatCurrency(balances.available, balances.currency)}
                </p>
                <p className="mt-1 text-xs text-[#5C6B84]">{balances.currency}</p>
              </div>
              <div className="rounded-xl border border-[#E4E9F2] bg-[#FBFCFE] p-4 text-sm text-[#445573]">
                <p>
                  <span className="font-semibold text-[#1D2E4B]">AH:</span> {user.accountHolderId || "—"}
                </p>
                <p className="mt-1 break-all">
                  <span className="font-semibold text-[#1D2E4B]">BA:</span> {user.balanceAccountId || "—"}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="ca-panel">
          <MainAccountTransfer onTransferComplete={loadOverview} onToast={setToast} />
          <p className="mt-3 text-xs text-[#5C6B84]">Balance refreshes automatically every 10 seconds.</p>
        </div>
      </section>

      <section>
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

