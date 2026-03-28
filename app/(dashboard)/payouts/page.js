"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    transferInstrumentId: "",
    currency: "USD",
    scheduleType: "daily",
    amount: 100,
  });

  const sendToTransferInstrumentCapability = user?.capabilities?.sendToTransferInstrument || {};
  const availableTransferInstruments = useMemo(
    () =>
      (sendToTransferInstrumentCapability?.transferInstruments || [])
        .filter((instrument) => instrument?.id && instrument?.allowed !== false)
        .map((instrument) => instrument.id),
    [sendToTransferInstrumentCapability?.transferInstruments]
  );
  const canSweepToTransferInstrument =
    Boolean(sendToTransferInstrumentCapability?.allowed) && availableTransferInstruments.length > 0;

  const loadSweeps = async () => {
    try {
      setError("");
      const data = await trackedFetch(`/api/adyen/sweeps?balanceAccountId=${user.balanceAccountId}`);
      setSweeps(data.sweeps || data.data || []);
    } catch (err) {
      setError(err.message || "Failed to load sweeps.");
    }
  };

  useEffect(() => {
    loadSweeps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!availableTransferInstruments.length) return;
    setForm((current) =>
      current.transferInstrumentId
        ? current
        : { ...current, transferInstrumentId: availableTransferInstruments[0] }
    );
  }, [availableTransferInstruments]);

  const createSweep = async (event) => {
    event.preventDefault();
    if (!canSweepToTransferInstrument) {
      setError("Sweeps are not enabled. Missing transfer instrument capability or eligible instrument.");
      return;
    }

    if (Number(form.amount) < 1 || Number(form.amount) > 1000) {
      setError("Amount must be between 1 and 1000.");
      return;
    }

    try {
      setError("");
      await trackedFetch("/api/adyen/sweeps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountHolderId: user.accountHolderId,
          balanceAccountId: user.balanceAccountId,
          transferInstrumentId: form.transferInstrumentId,
          scheduleType: form.scheduleType,
          amount: Number(form.amount),
          currency: form.currency,
        }),
      });
      setToast({ type: "success", message: "Sweep created." });
      loadSweeps();
    } catch (err) {
      setError(err.message || "Failed to create sweep.");
    }
  };

  return (
    <div className="space-y-6">
      <section className="ca-panel">
        <h1 className="ca-title">Payouts & Sweeps</h1>
        <p className="ca-muted mt-2">
          Configure a sweep to transfer instrument when your account holder has the required capability and eligible
          transfer instrument.
        </p>
      </section>

      <section className="ca-panel">
        <h2 className="ca-section-title mb-4">Setup Sweeps</h2>
        {error ? <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        {!canSweepToTransferInstrument ? (
          <p className="mb-4 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
            Sweeps are unavailable: this account holder must have `sendToTransferInstrument` capability and at least one
            eligible transfer instrument. Complete onboarding in Onboarding first.
          </p>
        ) : null}
        <form className="grid gap-3 md:grid-cols-3" onSubmit={createSweep}>
          <select
            required
            value={form.transferInstrumentId}
            onChange={(e) => setForm((s) => ({ ...s, transferInstrumentId: e.target.value }))}
            className="ca-input"
            disabled={!canSweepToTransferInstrument}
          >
            {availableTransferInstruments.length ? (
              availableTransferInstruments.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))
            ) : (
              <option value="">No eligible transfer instruments</option>
            )}
          </select>
          <select
            value={form.scheduleType}
            onChange={(e) => setForm((s) => ({ ...s, scheduleType: e.target.value }))}
            className="ca-input"
            disabled={!canSweepToTransferInstrument}
          >
            <option value="daily">daily</option>
            <option value="weekly">weekly</option>
            <option value="monthly">monthly</option>
            <option value="balance">balance</option>
          </select>
          <input
            type="number"
            min={1}
            max={1000}
            value={form.amount}
            onChange={(e) => setForm((s) => ({ ...s, amount: Number(e.target.value) }))}
            className="ca-input"
            placeholder="Amount (1-1000)"
            disabled={!canSweepToTransferInstrument}
          />
          <button type="submit" className="ca-button-dark" disabled={!canSweepToTransferInstrument}>
            Create Sweep
          </button>
        </form>
      </section>

      <section className="ca-panel">
        <h2 className="ca-section-title mb-3">Existing Sweeps</h2>
        {sweeps.length ? (
          <div className="overflow-x-auto">
            <table className="ca-table">
              <thead>
                <tr>
                  <th className="ca-th">ID</th>
                  <th className="ca-th">Type</th>
                  <th className="ca-th">Status</th>
                  <th className="ca-th">Schedule</th>
                  <th className="ca-th">Counterparty</th>
                </tr>
              </thead>
              <tbody>
                {sweeps.map((sweep) => (
                  <tr key={sweep.id} className="border-t border-[#EDF1F7]">
                    <td className="ca-td">{sweep.id}</td>
                    <td className="ca-td">{sweep.type}</td>
                    <td className="ca-td">{sweep.status}</td>
                    <td className="ca-td">{sweep.schedule?.type}</td>
                    <td className="ca-td">{sweep.counterparty?.transferInstrumentId || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No sweeps configured" message="Set one up using the section above." />
        )}
      </section>

      <section className="ca-panel-tight">
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

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

