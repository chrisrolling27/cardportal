"use client";

import { useEffect, useMemo, useState } from "react";
import CardVisual from "@/components/CardVisual";
import CopyButton from "@/components/CopyButton";
import StatusBadge from "@/components/StatusBadge";
import Toast from "@/components/Toast";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import ConfirmDialog from "@/components/ConfirmDialog";
import EmptyState from "@/components/EmptyState";
import { useApiHistory } from "@/context/ApiHistoryContext";
import { useAuth } from "@/context/AuthContext";

const PAN_CACHE_KEY = "cardportal_pan_cache_v1";

function readPanCache() {
  try {
    return JSON.parse(sessionStorage.getItem(PAN_CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writePanCache(value) {
  sessionStorage.setItem(PAN_CACHE_KEY, JSON.stringify(value));
}

export default function CardsPage() {
  const { user } = useAuth();
  const { trackedFetch } = useApiHistory();
  const [cards, setCards] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [revealed, setRevealed] = useState({});
  const [confirmClose, setConfirmClose] = useState(false);
  const [form, setForm] = useState({
    brand: "visa",
    cardholderName: user.companyName,
  });

  const loadCards = async () => {
    setLoading(true);
    try {
      const cache = readPanCache();
      const data = await trackedFetch(`/api/adyen/cards?balanceAccountId=${user.balanceAccountId}`);
      const list = (data.paymentInstruments || []).map((card) => ({
        ...card,
        fullDetails: cache[card.id] || null,
      }));
      setCards(list);
    } catch (err) {
      setToast({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createCard = async () => {
    try {
      const created = await trackedFetch("/api/adyen/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          balanceAccountId: user.balanceAccountId,
          brand: form.brand,
          cardholderName: form.cardholderName,
        }),
      });

      const fullDetails = {
        pan: created.card?.number || created.card?.pan || "",
        expiryMonth: created.card?.expiryMonth || created.expiryMonth || "",
        expiryYear: created.card?.expiryYear || created.expiryYear || "",
        cvc: created.card?.cvc || created.cvc || "",
      };
      const cache = readPanCache();
      cache[created.id] = fullDetails;
      writePanCache(cache);

      setCards((prev) => [{ ...created, fullDetails }, ...prev]);
      setRevealed((prev) => ({ ...prev, [created.id]: true }));
      setCreateOpen(false);
      setToast({ type: "success", message: "Card created." });
    } catch (err) {
      setToast({ type: "error", message: err.message });
    }
  };

  const updateStatus = async (status) => {
    if (!selected) return;
    if (status === "closed") {
      setConfirmClose(true);
      return;
    }
    try {
      const updated = await trackedFetch(`/api/adyen/cards/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setCards((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
      setSelected((prev) => ({ ...prev, ...updated }));
      setToast({ type: "success", message: "Card status updated." });
    } catch (err) {
      setToast({ type: "error", message: err.message });
    }
  };

  const confirmCloseCard = async () => {
    setConfirmClose(false);
    await updateStatus("closed");
  };

  const statusFor = (card) => card.status || card.card?.status || "active";

  const subtitle = useMemo(
    () => "Full card details only available at creation. If unavailable, only last 4 are shown.",
    []
  );

  return (
    <div className="space-y-6">
      <section className="flex items-center justify-between rounded-2xl bg-white p-6 shadow-soft">
        <div>
          <h1 className="text-2xl font-semibold">Cards Wallet</h1>
          <p className="mt-1 text-sm text-adyen-gray-600">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen((v) => !v)}
          className="rounded-lg bg-adyen-green px-4 py-2 font-semibold text-adyen-black"
        >
          + New Card
        </button>
      </section>

      {createOpen ? (
        <section className="rounded-2xl bg-white p-6 shadow-soft">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm font-medium">Brand</p>
              <div className="flex gap-2">
                {["visa", "mc"].map((brand) => (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => setForm((s) => ({ ...s, brand }))}
                    className={`rounded-md border px-3 py-2 text-sm ${
                      form.brand === brand
                        ? "border-adyen-black bg-adyen-black text-white"
                        : "border-adyen-gray-200"
                    }`}
                  >
                    {brand === "visa" ? "Visa" : "Mastercard"}
                  </button>
                ))}
              </div>
            </div>
            <input
              value={form.cardholderName}
              onChange={(e) => setForm((s) => ({ ...s, cardholderName: e.target.value }))}
              className="rounded-lg border border-adyen-gray-200 px-3 py-2"
              placeholder="Cardholder name"
            />
            <button type="button" onClick={createCard} className="rounded-lg bg-adyen-black px-4 py-2 text-white">
              Create
            </button>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <>
            <LoadingSkeleton className="h-56 w-full" />
            <LoadingSkeleton className="h-56 w-full" />
          </>
        ) : cards.length === 0 ? (
          <div className="md:col-span-2 xl:col-span-3">
            <EmptyState title="No cards yet" message="Create your first virtual card to get started." />
          </div>
        ) : (
          cards.map((card) => (
            <div key={card.id} className="space-y-2">
              <CardVisual
                card={card}
                revealed={Boolean(revealed[card.id])}
                onToggleReveal={() => setRevealed((prev) => ({ ...prev, [card.id]: !prev[card.id] }))}
                onSelect={() => setSelected(card)}
              />
              <div className="flex items-center justify-between text-sm">
                <StatusBadge status={statusFor(card)} />
                <span className="text-xs text-adyen-gray-500">{card.id}</span>
              </div>
            </div>
          ))
        )}
      </section>

      {selected ? (
        <section className="rounded-2xl bg-white p-6 shadow-soft">
          <h2 className="text-lg font-semibold">Card Details</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg bg-adyen-gray-50 p-3 text-sm">
              <p className="font-medium">Payment Instrument ID</p>
              <p className="mt-1 break-all">{selected.id}</p>
              <CopyButton value={selected.id} />
            </div>
            <div className="rounded-lg bg-adyen-gray-50 p-3 text-sm">
              <p className="font-medium">Status</p>
              <div className="mt-2 flex gap-2">
                <select
                  defaultValue={statusFor(selected)}
                  onChange={(e) => updateStatus(e.target.value)}
                  className="rounded-md border border-adyen-gray-200 px-2 py-1"
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                  <option value="suspended">suspended</option>
                  <option value="closed">closed</option>
                </select>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <ConfirmDialog
        open={confirmClose}
        title="Close card?"
        description="This operation is irreversible."
        confirmLabel="Close Card"
        onConfirm={confirmCloseCard}
        onCancel={() => setConfirmClose(false)}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

