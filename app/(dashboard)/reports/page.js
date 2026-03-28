"use client";

import { useEffect, useMemo, useState } from "react";
import AdyenComponentMount from "@/components/AdyenComponentMount";
import CopyButton from "@/components/CopyButton";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { useApiHistory } from "@/context/ApiHistoryContext";
import { copyText, formatCurrency } from "@/lib/utils";

const REPORTS_AH = "AH32CNB22322885LGZLFL8XL6";

export default function ReportsPage() {
  const { trackedFetch } = useApiHistory();
  const [accountHolder, setAccountHolder] = useState(null);
  const [balanceAccounts, setBalanceAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [ah, bas] = await Promise.all([
          trackedFetch("/api/adyen/reports/account-holder"),
          trackedFetch("/api/adyen/reports/balance-accounts"),
        ]);
        setAccountHolder(ah);
        setBalanceAccounts(bas.balanceAccounts || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [trackedFetch]);

  const totals = useMemo(
    () =>
      balanceAccounts.reduce(
        (acc, ba) => {
          const firstBalance = ba.balances?.[0]?.available;
          if (firstBalance?.currency === "USD") acc.usd += Number(firstBalance.value || 0);
          return acc;
        },
        { usd: 0 }
      ),
    [balanceAccounts]
  );

  const exportCsv = async () => {
    const header = "balanceAccountId,description,status,available,currency";
    const rows = balanceAccounts.map((ba) => {
      const available = ba.balances?.[0]?.available || {};
      return [ba.id, ba.description || "", ba.status || "", available.value || 0, available.currency || "USD"].join(
        ","
      );
    });
    await copyText([header, ...rows].join("\n"));
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-6 shadow-soft">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="mt-2 text-sm text-adyen-gray-600">
          Viewing platform-level reports for the configured Reports Account Holder.
        </p>
      </section>

      {loading ? (
        <LoadingSkeleton className="h-40 w-full" />
      ) : error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : (
        <>
          <section className="rounded-2xl bg-white p-6 shadow-soft">
            <h2 className="mb-3 text-lg font-semibold">Reports Account Holder</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg bg-adyen-gray-50 p-3 text-sm">
                <p className="font-medium">AH ID</p>
                <p className="break-all">{accountHolder?.id}</p>
                <CopyButton value={accountHolder?.id} />
              </div>
              <div className="rounded-lg bg-adyen-gray-50 p-3 text-sm">
                <p>Status: {accountHolder?.status || "—"}</p>
                <p>Description: {accountHolder?.description || "—"}</p>
                <p>Legal Entity: {accountHolder?.legalEntityId || "—"}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-soft">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Balance Accounts</h2>
              <button type="button" onClick={exportCsv} className="rounded-md bg-adyen-black px-3 py-2 text-sm text-white">
                Export CSV to Clipboard
              </button>
            </div>
            <p className="mb-3 text-sm text-adyen-gray-600">Total USD Available: {formatCurrency(totals.usd, "USD")}</p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-adyen-gray-500">
                  <tr>
                    <th className="pb-2">BA ID</th>
                    <th className="pb-2">Description</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Available</th>
                    <th className="pb-2">Currency</th>
                  </tr>
                </thead>
                <tbody>
                  {balanceAccounts.map((ba) => {
                    const available = ba.balances?.[0]?.available || {};
                    return (
                      <tr key={ba.id} className="border-t border-adyen-gray-100">
                        <td className="py-2">{ba.id}</td>
                        <td>{ba.description || "—"}</td>
                        <td>{ba.status || "—"}</td>
                        <td>{formatCurrency(available.value || 0, available.currency || "USD")}</td>
                        <td>{available.currency || "USD"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-soft">
            <h2 className="mb-3 text-lg font-semibold">Transactions Overview (Reports AH)</h2>
            <AdyenComponentMount
              componentName="TransactionsOverview"
              accountHolderId={REPORTS_AH}
              roles={["Transactions Overview Component: View"]}
            />
          </section>
        </>
      )}
    </div>
  );
}

