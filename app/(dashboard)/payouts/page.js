"use client";

import { useEffect, useState } from "react";
import AdyenComponentMount from "@/components/AdyenComponentMount";
import EmptyState from "@/components/EmptyState";
import Toast from "@/components/Toast";
import { useApiHistory } from "@/context/ApiHistoryContext";
import { useAuth } from "@/context/AuthContext";

export default function PayoutsPage() {
  const { user } = useAuth();
  const { trackedFetch } = useApiHistory();
  const [sweeps, setSweeps] = useState([]);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({
    transferInstrumentId: "",
    type: "push",
    currency: "USD",
    scheduleType: "daily",
    cronExpression: "0 0 * * *",
    targetAmount: 0,
    triggerAmount: 0,
  });

  const loadSweeps = async () => {
    try {
      const data = await trackedFetch(`/api/adyen/sweeps?balanceAccountId=${user.balanceAccountId}`);
      setSweeps(data.sweeps || data.data || []);
    } catch (err) {
      setToast({ type: "error", message: err.message });
    }
  };

  useEffect(() => {
    loadSweeps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createSweep = async (event) => {
    event.preventDefault();
    try {
      await trackedFetch("/api/adyen/sweeps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          balanceAccountId: user.balanceAccountId,
          ...form,
        }),
      });
      setToast({ type: "success", message: "Sweep created." });
      loadSweeps();
    } catch (err) {
      setToast({ type: "error", message: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-6 shadow-soft">
        <h1 className="text-2xl font-semibold">Payouts & Sweeps</h1>
        <p className="mt-2 text-sm text-adyen-gray-600">
          To configure a sweep, you need a verified transfer instrument. Add one through Hosted Onboarding in the
          Registration tab.
        </p>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-soft">
        <AdyenComponentMount
          componentName="PayoutsOverview"
          accountHolderId={user.accountHolderId}
          roles={["Payouts Overview Component: View"]}
          fallback={
            <p className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
              Payouts component could not load. This can happen if payouts are not configured yet.
            </p>
          }
        />
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-soft">
        <h2 className="mb-4 text-lg font-semibold">Create Sweep</h2>
        <form className="grid gap-3 md:grid-cols-3" onSubmit={createSweep}>
          <input
            required
            value={form.transferInstrumentId}
            onChange={(e) => setForm((s) => ({ ...s, transferInstrumentId: e.target.value }))}
            className="rounded-lg border border-adyen-gray-200 px-3 py-2"
            placeholder="Transfer Instrument ID"
          />
          <select
            value={form.type}
            onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))}
            className="rounded-lg border border-adyen-gray-200 px-3 py-2"
          >
            <option value="push">push</option>
            <option value="pull">pull</option>
          </select>
          <select
            value={form.scheduleType}
            onChange={(e) => setForm((s) => ({ ...s, scheduleType: e.target.value }))}
            className="rounded-lg border border-adyen-gray-200 px-3 py-2"
          >
            <option value="daily">daily</option>
            <option value="weekly">weekly</option>
            <option value="monthly">monthly</option>
            <option value="cron">cron</option>
            <option value="balance">balance</option>
          </select>
          {form.scheduleType === "cron" ? (
            <input
              value={form.cronExpression}
              onChange={(e) => setForm((s) => ({ ...s, cronExpression: e.target.value }))}
              className="rounded-lg border border-adyen-gray-200 px-3 py-2"
              placeholder="Cron expression"
            />
          ) : null}
          <input
            type="number"
            value={form.targetAmount}
            onChange={(e) => setForm((s) => ({ ...s, targetAmount: Number(e.target.value) }))}
            className="rounded-lg border border-adyen-gray-200 px-3 py-2"
            placeholder="Target amount"
          />
          <input
            type="number"
            value={form.triggerAmount}
            onChange={(e) => setForm((s) => ({ ...s, triggerAmount: Number(e.target.value) }))}
            className="rounded-lg border border-adyen-gray-200 px-3 py-2"
            placeholder="Trigger amount"
          />
          <button type="submit" className="rounded-lg bg-adyen-black px-4 py-2 text-white">
            Create Sweep
          </button>
        </form>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-soft">
        <h2 className="mb-3 text-lg font-semibold">Existing Sweeps</h2>
        {sweeps.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-adyen-gray-500">
                <tr>
                  <th className="pb-2">ID</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Schedule</th>
                  <th className="pb-2">Counterparty</th>
                </tr>
              </thead>
              <tbody>
                {sweeps.map((sweep) => (
                  <tr key={sweep.id} className="border-t border-adyen-gray-100">
                    <td className="py-2">{sweep.id}</td>
                    <td>{sweep.type}</td>
                    <td>{sweep.status}</td>
                    <td>{sweep.schedule?.type}</td>
                    <td>{sweep.counterparty?.transferInstrumentId || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No sweeps configured" message="Create one using the form above." />
        )}
      </section>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

