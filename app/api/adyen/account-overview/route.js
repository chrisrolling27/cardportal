import { adyenPlatformRequest } from "@/lib/adyen";

export async function POST(request) {
  try {
    const { accountHolderId, balanceAccountId } = await request.json();
    if (!accountHolderId || !balanceAccountId) {
      return Response.json({ error: "accountHolderId and balanceAccountId are required." }, { status: 400 });
    }

    const accountHolder = await adyenPlatformRequest(`/accountHolders/${accountHolderId}`, "GET");
    const balanceAccount = await adyenPlatformRequest(`/balanceAccounts/${balanceAccountId}`, "GET");

    return Response.json({ accountHolder, balanceAccount });
  } catch (error) {
    return Response.json(
      { error: error.message || "Failed to fetch account overview.", details: error.response || null },
      { status: error.status || 500 }
    );
  }
}

