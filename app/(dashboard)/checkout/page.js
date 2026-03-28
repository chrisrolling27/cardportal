"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatCurrency, generateOrderReference } from "@/lib/utils";
import { useApiHistory } from "@/context/ApiHistoryContext";
import LoadingSkeleton from "@/components/LoadingSkeleton";

export default function CheckoutPage() {
  const { trackedFetch } = useApiHistory();
  const [amountInput, setAmountInput] = useState("10.00");
  const [reference, setReference] = useState(generateOrderReference());
  const [paymentResult, setPaymentResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const dropinRef = useRef(null);
  const amountMinorRef = useRef(0);
  const referenceRef = useRef(reference);

  const amountMinor = useMemo(() => {
    const parsed = Number(amountInput);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return Math.round(parsed * 100);
  }, [amountInput]);

  useEffect(() => {
    amountMinorRef.current = amountMinor;
  }, [amountMinor]);

  useEffect(() => {
    referenceRef.current = reference;
  }, [reference]);

  useEffect(() => {
    let mounted = true;

    const mountDropin = async () => {
      setLoading(true);
      setError("");
      setPaymentResult(null);
      try {
        const paymentMethodsResponse = await trackedFetch("/api/adyen/checkout/payment-methods", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: 1000, currency: "USD" }),
        });

        const { default: AdyenCheckout } = await import("@adyen/adyen-web");
        const { Dropin } = await import("@adyen/adyen-web");
        await import("@adyen/adyen-web/styles/adyen.css");

        const checkout = await AdyenCheckout({
          environment: "test",
          clientKey: process.env.NEXT_PUBLIC_ADYEN_CLIENT_KEY,
          paymentMethodsResponse,
          onSubmit: async (state, dropin) => {
            if (!state?.isValid) return;
            const currentAmount = amountMinorRef.current;
            const currentReference = referenceRef.current;

            if (!currentAmount) {
              setError("Enter a valid amount before paying.");
              return;
            }

            setProcessing(true);
            setError("");
            setPaymentResult(null);
            try {
              const response = await trackedFetch("/api/adyen/checkout/payments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  amount: currentAmount,
                  currency: "USD",
                  reference: currentReference,
                  paymentMethod: state.data.paymentMethod,
                  browserInfo: state.data.browserInfo,
                  origin: window.location.origin,
                  returnUrl: `${window.location.origin}/checkout`,
                }),
              });

              if (response.action) {
                dropin.handleAction(response.action);
              } else {
                setPaymentResult({ success: response.resultCode === "Authorised", ...response });
                setHistory((prev) => [
                  {
                    timestamp: new Date().toISOString(),
                    amount: currentAmount,
                    reference: currentReference,
                    result: response.resultCode || "Unknown",
                  },
                  ...prev,
                ]);
              }
            } catch (err) {
              setPaymentResult({ success: false, resultCode: "Error", errorMessage: err.message });
              setError(err.message || "Payment failed.");
            } finally {
              setProcessing(false);
            }
          },
          onPaymentCompleted: (result) => {
            const currentAmount = amountMinorRef.current;
            const currentReference = referenceRef.current;
            setPaymentResult({ success: result.resultCode === "Authorised", ...result });
            setHistory((prev) => [
              {
                timestamp: new Date().toISOString(),
                amount: currentAmount,
                reference: currentReference,
                result: result.resultCode || "Unknown",
              },
              ...prev,
            ]);
            setReference(generateOrderReference());
            setProcessing(false);
          },
          onPaymentFailed: (result) => {
            const currentAmount = amountMinorRef.current;
            const currentReference = referenceRef.current;
            setPaymentResult({ success: false, ...result });
            setHistory((prev) => [
              {
                timestamp: new Date().toISOString(),
                amount: currentAmount,
                reference: currentReference,
                result: result?.resultCode || "Failed",
              },
              ...prev,
            ]);
            setProcessing(false);
          },
          onError: (err) => {
            setPaymentResult({ success: false, resultCode: "Error", errorMessage: err.message });
            setError(err.message || "Checkout error.");
            setProcessing(false);
          },
        });

        if (!mounted) return;
        dropinRef.current?.unmount?.();
        let dropin;
        try {
          dropin = new Dropin(checkout, { showPayButton: true }).mount("#dropin-container");
        } catch {
          dropin = checkout.create("dropin", { showPayButton: true }).mount("#dropin-container");
        }
        dropinRef.current = dropin;
      } catch (err) {
        if (!mounted) return;
        setError(err.message || "Failed to initialize checkout.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    mountDropin();
    return () => dropinRef.current?.unmount?.();
  }, [trackedFetch]);

  const resultCard = useMemo(() => {
    if (!paymentResult) return null;
    if (paymentResult.resultCode === "Authorised") {
      return (
        <div className="rounded-xl bg-green-50 p-4 text-green-700">
          <p className="font-semibold">Payment Authorised ✅</p>
          <button
            className="mt-2 rounded-md bg-green-600 px-3 py-2 text-sm text-white"
            onClick={() => setReference(generateOrderReference())}
          >
            New Reference
          </button>
        </div>
      );
    }
    return (
      <div className="rounded-xl bg-red-50 p-4 text-red-700">
        <p className="font-semibold">Payment Failed: {paymentResult.resultCode || "Error"}</p>
        <p className="text-sm">{paymentResult.refusalReason || paymentResult.errorMessage || "Please retry."}</p>
      </div>
    );
  }, [paymentResult]);

  return (
    <div className="space-y-6">
      <section className="ca-panel">
        <h1 className="ca-title">Checkout</h1>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-[#E4E9F2] bg-[#FBFCFE] p-4">
            <p className="text-sm text-[#5C6B84]">Amount (USD)</p>
            <input
              type="number"
              min="0.01"
              step="0.01"
              className="ca-input mt-2"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
            />
            <p className="mt-3 text-xs text-[#5C6B84]">Reference</p>
            <p className="text-xs text-[#74839C]">{reference}</p>
            <p className="mt-4 text-xs text-[#5C6B84]">
              Use a test card from your created cards in the `Cards` tab.
            </p>
            <p className="mt-2 text-sm font-semibold text-[#1B2B48]">
              Charge amount: {formatCurrency(amountMinor, "USD")}
            </p>
          </div>

          <div className="rounded-xl border border-[#E4E9F2] bg-white p-4">
            {loading ? <LoadingSkeleton className="h-64 w-full" /> : null}
            {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
            {processing ? <p className="mb-3 text-xs text-[#5C6B84]">Processing payment...</p> : null}
            <div id="dropin-container" />
          </div>
        </div>
      </section>

      {resultCard}

      <section className="ca-panel">
        <h2 className="ca-section-title mb-3">Session Payment History</h2>
        <div className="overflow-x-auto">
          <table className="ca-table">
            <thead>
              <tr>
                <th className="ca-th">Time</th>
                <th className="ca-th">Amount</th>
                <th className="ca-th">Reference</th>
                <th className="ca-th">Result</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row, idx) => (
                <tr key={`${row.timestamp}_${idx}`} className="border-t border-[#EDF1F7]">
                  <td className="ca-td">{new Date(row.timestamp).toLocaleTimeString()}</td>
                  <td className="ca-td">{formatCurrency(row.amount, "USD")}</td>
                  <td className="ca-td">{row.reference}</td>
                  <td className="ca-td">{row.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

