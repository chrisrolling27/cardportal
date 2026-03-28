import { adyenPlatformRequest } from "@/lib/adyen";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const balanceAccountId = searchParams.get("balanceAccountId");
    if (!balanceAccountId) {
      return Response.json({ error: "balanceAccountId is required." }, { status: 400 });
    }

    const data = await adyenPlatformRequest(
      `/balanceAccounts/${balanceAccountId}/paymentInstruments`,
      "GET"
    );
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: error.message || "Failed to list cards.", details: error.response || null },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { balanceAccountId, brand, cardholderName } = await request.json();
    if (!balanceAccountId || !brand || !cardholderName) {
      return Response.json(
        { error: "balanceAccountId, brand, and cardholderName are required." },
        { status: 400 }
      );
    }

    const isVisa = brand === "visa";
    const data = await adyenPlatformRequest("/paymentInstruments", "POST", {
      type: "card",
      balanceAccountId,
      card: {
        brand: isVisa ? "visa" : "mc",
        brandVariant: isVisa ? "visa_credit_s" : "mc_credit_mco",
        cardholderName,
        formFactor: "virtual",
      },
      issuingCountryCode: "US",
      description: isVisa
        ? "CardPortal Virtual Visa Card"
        : "CardPortal Virtual Mastercard",
    });

    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: error.message || "Failed to create card.", details: error.response || null },
      { status: error.status || 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const { id, status } = await request.json();
    if (!id || !status) {
      return Response.json({ error: "id and status are required." }, { status: 400 });
    }

    const data = await adyenPlatformRequest(`/paymentInstruments/${id}`, "PATCH", { status });
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: error.message || "Failed to update card.", details: error.response || null },
      { status: error.status || 500 }
    );
  }
}

