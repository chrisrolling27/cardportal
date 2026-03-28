"use client";

import { useEffect, useState } from "react";
import AdyenComponentMount from "@/components/AdyenComponentMount";
import EmptyState from "@/components/EmptyState";
import Toast from "@/components/Toast";
import { useApiHistory } from "@/context/ApiHistoryContext";
import { formatCurrency } from "@/lib/utils";

const REPORTS_AH = "AH32CNB22322885LGZLFL8XL6";

export default function CapitalPage() {
  const { trackedFetch } = useApiHistory();
  const [grants, setGrants] = useState([]);
  const [toast, setToast] = useState(null);
  const [amountValue, setAmountValue] = useState(100000);

  const loadGrants = async () => {
    try {
      const data = await trackedFetch("/api/adyen/capital/grants");
      setGrants(data.data || data.grants || []);
    } catch (err) {
      setToast({ type: "error", message: err.message });
    }
  };

  useEffect(() => {
    loadGrants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestGrant = async () => {
    try {
      await trackedFetch("/api/adyen/capital/grants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountValue }),
      });
      setToast({ type: "success", message: "Grant request submitted." });
      loadGrants();
    } catch (err) {
      setToast({ type: "error", message: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-6 shadow-soft">
        <h1 className="text-2xl font-semibold">Capital</h1>
        <p className="mt-2 text-sm text-adyen-gray-600">
          Capital component attempted to load for the Reports Account Holder. If no data appears, this account holder
          may not have active capital eligibility.
        </p>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-soft">
        <AdyenComponentMount
          componentName="CapitalOverview"
          accountHolderId={REPORTS_AH}
          roles={["Capital Overview Component: View"]}
          fallback={
            <p className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
              Capital component not available for this account holder. Showing direct API fallback below.
            </p>
          }
        />
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-soft">
        <h2 className="mb-3 text-lg font-semibold">Grants</h2>
        {grants.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-adyen-gray-500">
                <tr>
                  <th className="pb-2">Grant ID</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {grants.map((grant) => (
                  <tr key={grant.id} className="border-t border-adyen-gray-100">
                    <td className="py-2">{grant.id}</td>
                    <td>{formatCurrency(grant.amount?.value, grant.amount?.currency)}</td>
                    <td>{grant.status || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No grants found" message="Use the request form to submit a new grant request." />
        )}

        <div className="mt-4 flex gap-3">
          <input
            type="number"
            value={amountValue}
            onChange={(e) => setAmountValue(e.target.value)}
            className="rounded-lg border border-adyen-gray-200 px-3 py-2"
          />
          <button type="button" onClick={requestGrant} className="rounded-lg bg-adyen-black px-4 py-2 text-white">
            Request Grant
          </button>
        </div>
      </section>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

