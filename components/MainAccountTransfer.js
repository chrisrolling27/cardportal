"use client";

import { useEffect, useMemo, useState } from "react";
import { useApiHistory } from "@/context/ApiHistoryContext";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/lib/utils";

const DEFAULT_AMOUNT = 100;

function uniqueIds(ids) {
  return Array.from(new Set((ids || []).filter(Boolean)));
}

export default function MainAccountTransfer({ onTransferComplete, onSuccess, onError }) {
  const { user } = useAuth();
  const { trackedFetch } = useApiHistory();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    sourceType: "balanceAccount",
    destinationType: "balanceAccount",
    transferInstrumentId: "",
    amount: DEFAULT_AMOUNT,
  });

  const receiveCapability = user?.capabilities?.receiveFromTransferInstrument || {};
  const sendCapability = user?.capabilities?.sendToTransferInstrument || {};

  const receiveInstrumentIds = useMemo(
    () =>
      uniqueIds(
        (receiveCapability?.transferInstruments || [])
          .filter((instrument) => instrument?.allowed !== false)
          .map((instrument) => instrument?.id)
      ),
    [receiveCapability?.transferInstruments]
  );
  const sendInstrumentIds = useMemo(
    () =>
      uniqueIds(
        (sendCapability?.transferInstruments || [])
          .filter((instrument) => instrument?.allowed !== false)
          .map((instrument) => instrument?.id)
      ),
    [sendCapability?.transferInstruments]
  );

  const activeInstrumentIds =
    form.sourceType === "transferInstrument"
      ? receiveInstrumentIds
      : form.destinationType === "transferInstrument"
        ? sendInstrumentIds
        : [];
  const transferInstrumentAvailable = activeInstrumentIds.length > 0;
  const amountNumber = Number(form.amount);
  const hasAmountInRange = Number.isFinite(amountNumber) && amountNumber >= 0 && amountNumber <= 999;
  const needsTransferInstrumentId = form.sourceType === "transferInstrument" || form.destinationType === "transferInstrument";
  const canSubmit =
    !isSubmitting &&
    Boolean(user?.balanceAccountId) &&
    hasAmountInRange &&
    (!needsTransferInstrumentId || Boolean(form.transferInstrumentId));

  useEffect(() => {
    if (!needsTransferInstrumentId) return;
    if (activeInstrumentIds.includes(form.transferInstrumentId)) return;
    setForm((prev) => ({ ...prev, transferInstrumentId: activeInstrumentIds[0] || "" }));
  }, [activeInstrumentIds, form.transferInstrumentId, needsTransferInstrumentId]);

  useEffect(() => {
    if (form.sourceType === "transferInstrument" && form.destinationType !== "balanceAccount") {
      setForm((prev) => ({ ...prev, destinationType: "balanceAccount" }));
    }
  }, [form.destinationType, form.sourceType]);

  const submitTransfer = async (event) => {
    event.preventDefault();
    if (!user?.balanceAccountId) {
      const message = "Missing balance account ID in session.";
      setError(message);
      if (onError) onError(message);
      return;
    }

    if (!hasAmountInRange) {
      const message = "Amount must be between 0 and 999.";
      setError(message);
      if (onError) onError(message);
      return;
    }

    if (needsTransferInstrumentId && !form.transferInstrumentId) {
      const message = "Select a transfer instrument.";
      setError(message);
      if (onError) onError(message);
      return;
    }

    const source =
      form.sourceType === "transferInstrument"
        ? { type: "transferInstrument", id: form.transferInstrumentId }
        : { type: "balanceAccount", id: user.balanceAccountId };
    const destination =
      form.sourceType === "transferInstrument"
        ? { type: "balanceAccount", id: user.balanceAccountId }
        : form.destinationType === "transferInstrument"
          ? { type: "transferInstrument", id: form.transferInstrumentId }
          : { type: "balanceAccount", id: "" };

    const amountLabel = formatCurrency(Math.round(amountNumber * 100), "USD");

    try {
      setIsSubmitting(true);
      setError("");
      await trackedFetch("/api/adyen/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountNumber,
          currency: "USD",
          source,
          destination,
          description: "Transfer funds",
          referenceForBeneficiary: "MainAccountTransfer",
        }),
      });
      if (onTransferComplete) await onTransferComplete();
      setError("");
      setForm((prev) => ({ ...prev, amount: DEFAULT_AMOUNT }));
      if (onSuccess) onSuccess(`Transfer submitted: ${amountLabel}.`);
    } catch (err) {
      const message = err.message || "Transfer failed.";
      setError(message);
      if (onError) onError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="ca-section-title">Transfer Funds</h2>

      <form onSubmit={submitTransfer} className="mt-4 grid gap-3">
        <label className="text-xs font-medium text-[#3B4556]">Source of funds</label>
        <select
          className="ca-input"
          value={form.sourceType}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              sourceType: event.target.value,
              destinationType: event.target.value === "transferInstrument" ? "balanceAccount" : prev.destinationType,
            }))
          }
          disabled={isSubmitting}
        >
          <option value="balanceAccount">Your balance account</option>
          <option value="transferInstrument">Transfer instrument</option>
        </select>

        {form.sourceType === "balanceAccount" ? (
          <>
            <label className="text-xs font-medium text-[#3B4556]">Destination</label>
            <select
              className="ca-input"
              value={form.destinationType}
              onChange={(event) => setForm((prev) => ({ ...prev, destinationType: event.target.value }))}
              disabled={isSubmitting}
            >
              <option value="balanceAccount">Main account</option>
              <option value="transferInstrument">Transfer instrument</option>
            </select>
          </>
        ) : (
          <p className="rounded-lg border border-[#E4E9F2] bg-[#FBFCFE] px-3 py-2 text-xs text-[#5C6B84]">
            Destination: Your balance account
          </p>
        )}

        {needsTransferInstrumentId ? (
          <>
            <label className="text-xs font-medium text-[#3B4556]">Transfer instrument</label>
            <select
              className="ca-input"
              value={form.transferInstrumentId}
              onChange={(event) => setForm((prev) => ({ ...prev, transferInstrumentId: event.target.value }))}
              disabled={isSubmitting || !transferInstrumentAvailable}
            >
              {transferInstrumentAvailable ? (
                activeInstrumentIds.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))
              ) : (
                <option value="">No eligible transfer instruments</option>
              )}
            </select>
          </>
        ) : null}

        <label className="text-xs font-medium text-[#3B4556]">Amount (USD, whole dollars 0-999)</label>
        <input
          type="number"
          min={0}
          max={999}
          step={1}
          className="ca-input"
          value={form.amount}
          onChange={(event) => setForm((prev) => ({ ...prev, amount: Number(event.target.value) }))}
          disabled={isSubmitting}
        />

        {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

        <button type="submit" className="ca-button-dark h-11 w-full" disabled={!canSubmit}>
          {isSubmitting ? "Transferring..." : "Submit transfer"}
        </button>
      </form>
    </div>
  );
}
