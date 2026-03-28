"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ORDER_ITEMS } from "@/lib/constants";
import { formatCurrency, generateOrderReference } from "@/lib/utils";
import { useApiHistory } from "@/context/ApiHistoryContext";
import LoadingSkeleton from "@/components/LoadingSkeleton";

function randomOrder() {
  const amount = Math.floor(Math.random() * 50000) + 100;
  const item = ORDER_ITEMS[Math.floor(Math.random() * ORDER_ITEMS.length)];
  return { amount, item, reference: generateOrderReference() };
}

export default function CheckoutPage() {
  const { trackedFetch } = useApiHistory();
  const [order, setOrder] = useState(randomOrder);
  const [paymentResult, setPaymentResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const dropinRef = useRef(null);

  const mountDropin = useCallback(async () => {
    setLoading(true);
    setError("");
    setPaymentResult(null);
    try {
      dropinRef.current?.unmount?.();

      const session = await trackedFetch("/api/adyen/checkout/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: order.amount,
          currency: "USD",
          reference: order.reference,
          returnUrl: `${window.location.origin}/checkout`,
        }),
      });

      const { default: AdyenCheckout } = await import("@adyen/adyen-web");
      const { Dropin } = await import("@adyen/adyen-web");
      await import("@adyen/adyen-web/styles/adyen.css");

      const checkout = await AdyenCheckout({
        environment: "test",
        clientKey: process.env.NEXT_PUBLIC_ADYEN_CLIENT_KEY,
        session: {
          id: session.id,
          sessionData: session.sessionData,
        },
        onPaymentCompleted: (result) => {
          setPaymentResult({ success: result.resultCode === "Authorised", ...result });
          setHistory((prev) => [
            {
              timestamp: new Date().toISOString(),
              item: order.item,
              amount: order.amount,
              result: result.resultCode,
            },
            ...prev,
          ]);
        },
        onPaymentFailed: (result) => {
          setPaymentResult({ success: false, ...result });
          setHistory((prev) => [
            {
              timestamp: new Date().toISOString(),
              item: order.item,
              amount: order.amount,
              result: result?.resultCode || "Failed",
            },
            ...prev,
          ]);
        },
        onError: (err) => {
          setPaymentResult({ success: false, resultCode: "Error", errorMessage: err.message });
        },
      });

      let dropin;
      try {
        dropin = new Dropin(checkout, {}).mount("#dropin-container");
      } catch {
        dropin = checkout.create("dropin").mount("#dropin-container");
      }
      dropinRef.current = dropin;
    } catch (err) {
      setError(err.message || "Failed to initialize checkout.");
    } finally {
      setLoading(false);
    }
  }, [order.amount, order.item, order.reference, trackedFetch]);

  useEffect(() => {
    mountDropin();
    return () => dropinRef.current?.unmount?.();
  }, [mountDropin]);

  const randomizeOrder = () => setOrder(randomOrder());

  const resultCard = useMemo(() => {
    if (!paymentResult) return null;
    if (paymentResult.resultCode === "Authorised") {
      return (
        <div className="rounded-xl bg-green-50 p-4 text-green-700">
          <p className="font-semibold">Payment Authorised ✅</p>
          <button className="mt-2 rounded-md bg-green-600 px-3 py-2 text-sm text-white" onClick={randomizeOrder}>
            Pay Again
          </button>
        </div>
      );
    }
    return (
      <div className="rounded-xl bg-red-50 p-4 text-red-700">
        <p className="font-semibold">Payment Failed: {paymentResult.resultCode || "Error"}</p>
        <p className="text-sm">{paymentResult.refusalReason || paymentResult.errorMessage || "Please retry."}</p>
        <button className="mt-2 rounded-md bg-red-600 px-3 py-2 text-sm text-white" onClick={mountDropin}>
          Try Again
        </button>
      </div>
    );
  }, [mountDropin, paymentResult]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-6 shadow-soft">
        <h1 className="text-2xl font-semibold">Checkout Simulator</h1>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl bg-adyen-gray-50 p-4">
            <p className="text-sm text-adyen-gray-600">Store Name</p>
            <p className="font-semibold">CardPortal Demo Store 🛍️</p>
            <p className="mt-3 text-sm text-adyen-gray-600">Order Item</p>
            <p className="font-medium">{order.item}</p>
            <p className="mt-3 text-sm text-adyen-gray-600">Amount</p>
            <p className="text-xl font-semibold">{formatCurrency(order.amount, "USD")}</p>
            <p className="mt-3 text-xs text-adyen-gray-500">{order.reference}</p>
            <button
              type="button"
              onClick={randomizeOrder}
              className="mt-4 rounded-md bg-adyen-black px-3 py-2 text-sm text-white"
            >
              Randomize Order
            </button>
          </div>

          <div className="rounded-xl border border-adyen-gray-200 p-4">
            {loading ? <LoadingSkeleton className="h-64 w-full" /> : null}
            {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
            <div id="dropin-container" />
          </div>
        </div>
      </section>

      {resultCard}

      <section className="rounded-2xl bg-white p-6 shadow-soft">
        <h2 className="mb-3 text-lg font-semibold">Session Payment History</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-adyen-gray-500">
              <tr>
                <th className="pb-2">Time</th>
                <th className="pb-2">Item</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Result</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row, idx) => (
                <tr key={`${row.timestamp}_${idx}`} className="border-t border-adyen-gray-100">
                  <td className="py-2">{new Date(row.timestamp).toLocaleTimeString()}</td>
                  <td>{row.item}</td>
                  <td>{formatCurrency(row.amount, "USD")}</td>
                  <td>{row.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

