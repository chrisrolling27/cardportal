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
      currency,
      referenceForBeneficiary,
      description,
      reference,
    } = await request.json();
    const sourceBalanceAccountId = String(process.env.SPECIAL_BA || "").trim();

    if (!destinationBalanceAccountId) {
      return Response.json({ error: "destinationBalanceAccountId is required." }, { status: 400 });
    }
    if (!sourceBalanceAccountId) {
      return Response.json({ error: "SPECIAL_BA is not configured." }, { status: 500 });
    }

    const amountMinor = Number(amountValue ?? 100000);
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
      return Response.json({ error: "amountValue must be a positive number." }, { status: 400 });
    }

    const data = await adyenTransfersRequest("/transfers", "POST", {
      amount: { value: amountMinor, currency: currency || "USD" },
      balanceAccountId: sourceBalanceAccountId,
      category: "internal",
      counterparty: { balanceAccountId: destinationBalanceAccountId },
      referenceForBeneficiary: referenceForBeneficiary || "FundsForYourBalanceAccount",
      reference: reference || crypto.randomUUID(),
      description: description || "Transfer from SPECIAL_BA to session balance account",
    });

    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: error.message || "Failed to create transfer.", details: error.response || null },
      { status: error.status || 500 }
    );
  }
}

