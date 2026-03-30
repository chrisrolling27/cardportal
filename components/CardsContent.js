"use client";

import { useCallback, useEffect, useState } from "react";
import CardWalletViewer from "@/components/CardWalletViewer";
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
  const [revealByCardId, setRevealByCardId] = useState({});
  const [revealLoadingByCardId, setRevealLoadingByCardId] = useState({});
  const [revealErrorByCardId, setRevealErrorByCardId] = useState({});

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
      const list = payload?.paymentInstruments || [];
      setCards(list);
      const idSet = new Set(list.map((item) => item?.id).filter(Boolean));
      setRevealByCardId((prev) =>
        Object.fromEntries(Object.entries(prev).filter(([cardId]) => idSet.has(cardId)))
      );
      setRevealLoadingByCardId((prev) =>
        Object.fromEntries(Object.entries(prev).filter(([cardId]) => idSet.has(cardId)))
      );
      setRevealErrorByCardId((prev) =>
        Object.fromEntries(Object.entries(prev).filter(([cardId]) => idSet.has(cardId)))
      );
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

  const revealCardDetails = useCallback(
    async (paymentInstrumentId) => {
      if (!paymentInstrumentId) return null;
      if (revealByCardId[paymentInstrumentId]) {
        setRevealErrorByCardId((prev) => ({ ...prev, [paymentInstrumentId]: "" }));
        return revealByCardId[paymentInstrumentId];
      }

      setRevealLoadingByCardId((prev) => ({ ...prev, [paymentInstrumentId]: true }));
      setRevealErrorByCardId((prev) => ({ ...prev, [paymentInstrumentId]: "" }));
      try {
        const payload = await trackedFetch("/api/adyen/cards/reveal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentInstrumentId }),
        });
        setRevealByCardId((prev) => ({ ...prev, [paymentInstrumentId]: payload }));
        return payload;
      } catch (error) {
        const message = getApiErrorMessage(error);
        setRevealErrorByCardId((prev) => ({ ...prev, [paymentInstrumentId]: message }));
        return null;
      } finally {
        setRevealLoadingByCardId((prev) => ({ ...prev, [paymentInstrumentId]: false }));
      }
    },
    [revealByCardId, trackedFetch]
  );

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
      showSuccess("Card created!");
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
        <h2 className="ca-section-title">Issue card</h2>
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
            {isCreating ? "Creating..." : "Issue card"}
          </button>
        </form>
      </section>

      <CardWalletViewer
        cards={cards}
        loading={cardsLoading}
        error={cardsError}
        revealByCardId={revealByCardId}
        revealLoadingByCardId={revealLoadingByCardId}
        revealErrorByCardId={revealErrorByCardId}
        onRevealCardDetails={revealCardDetails}
        onRetry={loadCards}
        title="Wallet"
        subtitle=""
      />

      <Toast toast={toast} onClose={clearToast} />
    </div>
  );
}
