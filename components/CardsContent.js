"use client";

import { useCallback, useEffect, useState } from "react";
import Toast, { useToast } from "@/components/Toast";
import { useApiHistory } from "@/context/ApiHistoryContext";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/lib/apiError";

export default function CardsContent() {
  const { user } = useAuth();
  const { trackedFetch } = useApiHistory();
  const { toast, clearToast, showError, showSuccess } = useToast();
  const [brand, setBrand] = useState("visa");
  const [cards, setCards] = useState([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [cardsError, setCardsError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const loadCards = useCallback(async () => {
    if (!user?.balanceAccountId) {
      setCards([]);
      setCardsError("Missing balance account ID in session.");
      setCardsLoading(false);
      return;
    }

    setCardsLoading(true);
    setCardsError("");
    try {
      const payload = await trackedFetch(`/api/adyen/cards?balanceAccountId=${user.balanceAccountId}`);
      setCards(payload?.paymentInstruments || []);
    } catch (error) {
      const message = getApiErrorMessage(error);
      setCards([]);
      setCardsError(message);
      showError(message);
    } finally {
      setCardsLoading(false);
    }
  }, [showError, trackedFetch, user?.balanceAccountId]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const createCard = async (event) => {
    event.preventDefault();
    if (!user?.balanceAccountId) {
      showError("Missing balance account ID in session.");
      return;
    }

    try {
      setIsCreating(true);
      setCardsError("");
      await trackedFetch("/api/adyen/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          balanceAccountId: user.balanceAccountId,
          brand,
        }),
      });
      showSuccess("Card created.");
      await loadCards();
    } catch (error) {
      const message = getApiErrorMessage(error) || "Failed to create card.";
      setCardsError(message);
      showError(message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="ca-panel">
        <h2 className="ca-section-title">Create card</h2>
        <form onSubmit={createCard} className="mt-4 grid gap-3 md:max-w-md">
          <label className="text-xs font-medium text-[#3B4556]">Brand</label>
          <select
            value={brand}
            onChange={(event) => setBrand(event.target.value)}
            className="ca-input"
            disabled={isCreating}
          >
            <option value="visa">Visa</option>
            <option value="mc">Mastercard</option>
          </select>

          <button type="submit" className="ca-button-dark h-10 w-full" disabled={isCreating}>
            {isCreating ? "Creating..." : "Create card"}
          </button>
        </form>
      </section>

      <section className="ca-panel">
        <div className="flex items-center justify-between gap-3">
          <h2 className="ca-section-title">Issued cards</h2>
          <button type="button" className="ca-button-secondary h-9" onClick={loadCards} disabled={cardsLoading}>
            Refresh
          </button>
        </div>

        {cardsLoading ? <p className="ca-muted mt-3 text-sm">Loading cards...</p> : null}
        {cardsError ? <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{cardsError}</p> : null}
        {!cardsLoading && !cardsError && cards.length === 0 ? <p className="ca-muted mt-3 text-sm">No cards issued yet.</p> : null}
        {!cardsLoading && cards.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {cards.map((card) => (
              <li key={card.id} className="rounded-lg border border-[#E4E9F2] bg-[#FBFCFE] px-3 py-2 text-sm">
                <p className="font-medium text-[#00112C]">{card.id}</p>
                <p className="mt-1 text-xs text-[#5C6B84]">
                  {(card?.card?.brand || "card").toUpperCase()} · Last 4: {card?.card?.lastFour || "----"}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <Toast toast={toast} onClose={clearToast} />
    </div>
  );
}
