"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import CardWalletViewer from "@/components/CardWalletViewer";
import Toast, { useToast } from "@/components/Toast";
import { useApiHistory } from "@/context/ApiHistoryContext";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/lib/apiError";

const MAX_PAYMENT_INSTRUMENTS = 4;
const DEFAULT_BA_REFERENCE = "BA3296P22322BJ5P5CRKCB8R6";
const CARD_BRANDS = [
  {
    value: "visa",
    label: "Visa",
    accent: "from-[#1A1F71] via-[#1434CB] to-[#F7B600]",
    selectedBorder: "border-[#1434CB]",
    selectedBackground: "bg-gradient-to-r from-[#EEF3FF] to-[#FFF8E4]",
    selectedShadow: "shadow-[0_8px_20px_rgba(20,52,203,0.2)]",
    slotFill: "bg-gradient-to-r from-[#1A1F71] via-[#1434CB] to-[#F7B600]",
  },
  {
    value: "mc",
    label: "Mastercard",
    accent: "from-[#EB001B] via-[#FF5F00] to-[#F79E1B]",
    selectedBorder: "border-[#EB001B]",
    selectedBackground: "bg-gradient-to-r from-[#FFF0EC] via-[#FFF3EA] to-[#FFF7E8]",
    selectedShadow: "shadow-[0_8px_20px_rgba(235,0,27,0.18)]",
    slotFill: "bg-gradient-to-r from-[#EB001B] via-[#FF5F00] to-[#F79E1B]",
  },
];

function resolveBrandValue(card) {
  const rawBrand = String(card?.card?.brand || card?.brand || "").toLowerCase();
  if (rawBrand.includes("visa")) return "visa";
  if (rawBrand.includes("mc") || rawBrand.includes("master")) return "mc";
  return "";
}

export default function CardsContent() {
  const { user } = useAuth();
  const { trackedFetch } = useApiHistory();
  const { toast, clearToast, showError, showSuccess } = useToast();
  const [brand, setBrand] = useState("visa");
  const [reference, setReference] = useState("");
  const [cards, setCards] = useState([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [cardsError, setCardsError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [revealByCardId, setRevealByCardId] = useState({});
  const [revealLoadingByCardId, setRevealLoadingByCardId] = useState({});
  const [revealErrorByCardId, setRevealErrorByCardId] = useState({});
  const cardsCount = cards.length;
  const availableSlots = Math.max(MAX_PAYMENT_INSTRUMENTS - cardsCount, 0);
  const canCreateMoreCards = availableSlots > 0;
  const selectedBrandConfig = useMemo(
    () => CARD_BRANDS.find((item) => item.value === brand) || CARD_BRANDS[0],
    [brand]
  );

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
          reference: reference.trim(),
        }),
      });
      showSuccess("Card created!");
      setReference("");
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
        <p className="mt-1 text-sm text-[#5C6B84]">
          Create up to {MAX_PAYMENT_INSTRUMENTS} payment instruments to spend funds in your balance account{" "}
          {user?.balanceAccountId || DEFAULT_BA_REFERENCE}
        </p>
        <form onSubmit={createCard} className="mt-4 space-y-4">
          <div
            className={`rounded-2xl bg-gradient-to-r p-[1px] ${
              canCreateMoreCards ? selectedBrandConfig.accent : "from-[#C7CEDB] to-[#A8B3C7]"
            }`}
          >
            <div className="rounded-2xl bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#5C6B84]">Network</p>
                <p className="text-xs font-semibold text-[#334155]">
                  {cardsCount}/{MAX_PAYMENT_INSTRUMENTS} issued
                </p>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {CARD_BRANDS.map((option) => {
                  const isSelected = brand === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setBrand(option.value)}
                      disabled={isCreating}
                      className={`rounded-xl border p-3 text-left transition ${
                        isSelected
                          ? `${option.selectedBorder} ${option.selectedBackground} ${option.selectedShadow}`
                          : "border-[#E2E8F0] bg-[#F8FAFD] hover:border-[#B8C4D9]"
                      } ${isCreating ? "cursor-not-allowed opacity-70" : ""}`}
                    >
                      <p className="text-sm font-semibold text-[#0B1222]">{option.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: MAX_PAYMENT_INSTRUMENTS }).map((_, index) => {
              const slotCard = cards[index];
              const isFilled = Boolean(slotCard);
              const slotBrand = resolveBrandValue(slotCard);
              const slotBrandConfig = CARD_BRANDS.find((item) => item.value === slotBrand);
              return (
                <div
                  key={`slot-${index}`}
                  className={`h-2 rounded-full ${
                    isFilled ? slotBrandConfig?.slotFill || selectedBrandConfig.slotFill : "bg-[#E2E8F0]"
                  }`}
                  aria-hidden="true"
                />
              );
            })}
          </div>

          <div className="grid gap-2 md:max-w-md">
            <label htmlFor="card-reference" className="text-xs font-semibold uppercase tracking-[0.08em] text-[#5C6B84]">
              Reference
            </label>
            <input
              id="card-reference"
              type="text"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              className="ca-input"
              disabled={isCreating}
              maxLength={20}
            />
          </div>

          <button
            type="submit"
            className="ca-button-dark h-10 w-full md:max-w-md"
            disabled={isCreating}
          >
            {isCreating ? "Creating..." : "Issue payment instrument"}
          </button>
          {!canCreateMoreCards ? <p className="text-sm text-[#5C6B84]">Limit reached on this account (4/4).</p> : null}
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
