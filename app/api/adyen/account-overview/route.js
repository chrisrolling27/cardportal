import { adyenPlatformRequest } from "@/lib/adyen";

async function fetchOverview({ accountHolderId, balanceAccountId }) {
  const balanceAccount = await adyenPlatformRequest(`/balanceAccounts/${balanceAccountId}`, "GET");
  let accountHolder = null;

  // Keep account holder optional for compatibility with older views.
  if (accountHolderId) {
    accountHolder = await adyenPlatformRequest(`/accountHolders/${accountHolderId}`, "GET");
  }

  return { accountHolder, balanceAccount };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const balanceAccountId = searchParams.get("balanceAccountId");
    const accountHolderId = searchParams.get("accountHolderId");

    if (!balanceAccountId) {
      return Response.json({ error: "balanceAccountId is required." }, { status: 400 });
    }

    const data = await fetchOverview({ accountHolderId, balanceAccountId });
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: error.message || "Failed to fetch account overview.", details: error.response || null },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { accountHolderId, balanceAccountId } = await request.json();
    if (!balanceAccountId) {
      return Response.json({ error: "balanceAccountId is required." }, { status: 400 });
    }

    const data = await fetchOverview({ accountHolderId, balanceAccountId });
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: error.message || "Failed to fetch account overview.", details: error.response || null },
      { status: error.status || 500 }
    );
  }
}

