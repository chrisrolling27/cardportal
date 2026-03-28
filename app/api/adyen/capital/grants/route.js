import { adyenTransfersRequest } from "@/lib/adyen";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountHolderId =
      searchParams.get("accountHolderId") || process.env.REPORTS_ACCOUNTHOLDER_ID;
    const data = await adyenTransfersRequest(
      `/grants?accountHolderId=${encodeURIComponent(accountHolderId)}`,
      "GET"
    );
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: error.message || "Failed to fetch grants.", details: error.response || null },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { amountValue } = await request.json();
    const data = await adyenTransfersRequest("/grants", "POST", {
      amount: { value: Number(amountValue || 100000), currency: "USD" },
      accountHolderId: process.env.REPORTS_ACCOUNTHOLDER_ID,
      counterparty: { balanceAccountId: process.env.SPECIAL_BA },
    });
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: error.message || "Failed to request grant.", details: error.response || null },
      { status: error.status || 500 }
    );
  }
}

