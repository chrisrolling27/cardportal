"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdyenComponentMount from "@/components/AdyenComponentMount";
import CopyButton from "@/components/CopyButton";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { useApiHistory } from "@/context/ApiHistoryContext";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/lib/utils";

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
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
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
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [trackedFetch, user.accountHolderId, user.balanceAccountId]);

  const balances = useMemo(() => {
    const items = overview?.balanceAccount?.balances || [];
    const usd = items.find((item) => item?.balance?.currency === "USD") || items[0];
    return {
      available: usd?.available?.value || 0,
      pending: usd?.pending?.value || 0,
      currency: usd?.available?.currency || "USD",
    };
  }, [overview]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-r from-adyen-darkNavy via-adyen-navy to-emerald-700 p-6 text-white shadow-soft">
        <h1 className="text-3xl font-semibold">
          {greetingByHour()}, {user.companyName}
        </h1>
        <p className="mt-1 text-white/80">Here&apos;s your account overview</p>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-soft">
        {loading ? (
          <LoadingSkeleton className="h-36 w-full" />
        ) : error ? (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
        ) : (
          <>
            <p className="text-sm text-adyen-gray-500">Available Balance</p>
            <p className="mt-2 text-4xl font-bold text-adyen-black">
              {formatCurrency(balances.available, balances.currency)} {balances.currency}
            </p>
            <p className="mt-2 text-sm text-adyen-gray-600">
              Pending: {formatCurrency(balances.pending, balances.currency)}
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-xs">
              <div className="rounded-full bg-adyen-gray-50 px-3 py-2">
                AH: {user.accountHolderId} <CopyButton label="Copy" value={user.accountHolderId} />
              </div>
              <div className="rounded-full bg-adyen-gray-50 px-3 py-2">
                BA: {user.balanceAccountId} <CopyButton label="Copy" value={user.balanceAccountId} />
              </div>
            </div>
          </>
        )}
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-soft">
        <h2 className="mb-3 text-lg font-semibold">Transactions Overview</h2>
        <AdyenComponentMount
          componentName="TransactionsOverview"
          accountHolderId={user.accountHolderId}
          roles={["Transactions Overview Component: View"]}
        />
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <Link href="/cards" className="rounded-xl bg-white p-4 text-sm font-medium shadow-soft hover:bg-adyen-gray-50">
          Issue a Card
        </Link>
        <Link href="/payouts" className="rounded-xl bg-white p-4 text-sm font-medium shadow-soft hover:bg-adyen-gray-50">
          Make a Transfer
        </Link>
        <Link href="/reports" className="rounded-xl bg-white p-4 text-sm font-medium shadow-soft hover:bg-adyen-gray-50">
          View Reports
        </Link>
      </section>
    </div>
  );
}

