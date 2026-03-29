import { adyenTransfersRequest } from "@/lib/adyen";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountHolderId = searchParams.get("accountHolderId");
    const query = accountHolderId
      ? `?accountHolderId=${encodeURIComponent(accountHolderId)}`
      : "";
    const data = await adyenTransfersRequest(`/transfers${query}`, "GET");
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: error.message || "Failed to fetch transfers.", details: error.response || null },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request) {
  try {
    const {
      destinationBalanceAccountId,
      amountValue,
      amount,
      currency,
      referenceForBeneficiary,
      description,
      reference,
      source,
      destination,
    } = await request.json();
    const sourceBalanceAccountId = String(process.env.SPECIAL_BA || "").trim();

    if (!sourceBalanceAccountId) {
      return Response.json({ error: "SPECIAL_BA is not configured." }, { status: 500 });
    }

    const usesExplicitEndpoints = source && destination;
    const amountMinor = Number.isFinite(Number(amountValue))
      ? Number(amountValue)
      : Number.isFinite(Number(amount))
        ? Math.round(Number(amount) * 100)
        : 100000;

    if (!Number.isFinite(amountMinor) || amountMinor < 0 || amountMinor > 99900) {
      return Response.json({ error: "amount must be between 0 and 999." }, { status: 400 });
    }

    const resolveBalanceAccountId = (id) => {
      const trimmed = String(id || "").trim();
      return trimmed || sourceBalanceAccountId;
    };

    const transferPayload = {
      amount: { value: amountMinor, currency: currency || "USD" },
      category: "internal",
      referenceForBeneficiary: referenceForBeneficiary || "FundsForYourBalanceAccount",
      reference: reference || crypto.randomUUID(),
      description: description || "Main account transfer",
    };

    if (usesExplicitEndpoints) {
      const sourceType = source?.type === "transferInstrument" ? "transferInstrument" : "balanceAccount";
      const destinationType = destination?.type === "transferInstrument" ? "transferInstrument" : "balanceAccount";
      const sourceId = String(source?.id || "").trim();
      const destinationId = String(destination?.id || "").trim();

      if (sourceType === "transferInstrument" && !sourceId) {
        return Response.json({ error: "source transferInstrument id is required." }, { status: 400 });
      }
      if (destinationType === "transferInstrument" && !destinationId) {
        return Response.json({ error: "destination transferInstrument id is required." }, { status: 400 });
      }

      if (sourceType === "transferInstrument") {
        transferPayload.transferInstrumentId = sourceId;
      } else {
        transferPayload.balanceAccountId = resolveBalanceAccountId(sourceId);
      }

      transferPayload.counterparty =
        destinationType === "transferInstrument"
          ? { transferInstrumentId: destinationId }
          : { balanceAccountId: resolveBalanceAccountId(destinationId) };
    } else {
      if (!destinationBalanceAccountId) {
        return Response.json({ error: "destinationBalanceAccountId is required." }, { status: 400 });
      }

      transferPayload.balanceAccountId = sourceBalanceAccountId;
      transferPayload.counterparty = { balanceAccountId: destinationBalanceAccountId };
      transferPayload.description = description || "Transfer from SPECIAL_BA to session balance account";
    }

    const data = await adyenTransfersRequest("/transfers", "POST", transferPayload);

    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: error.message || "Failed to create transfer.", details: error.response || null },
      { status: error.status || 500 }
    );
  }
}

