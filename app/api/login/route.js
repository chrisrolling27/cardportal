import { adyenPlatformRequest } from "@/lib/adyen";

export async function POST(request) {
  try {
    const { email } = await request.json();
    if (!email) return Response.json({ error: "Email is required." }, { status: 400 });

    const lookup = await adyenPlatformRequest(
      `/accountHolders?reference=${encodeURIComponent(email)}`,
      "GET"
    );

    const accountHolder = lookup?.accountHolders?.[0];
    if (!accountHolder) {
      return Response.json({ error: "No account found for this email." }, { status: 404 });
    }

    const bas = await adyenPlatformRequest(
      `/accountHolders/${accountHolder.id}/balanceAccounts`,
      "GET"
    );
    const balanceAccount = bas?.balanceAccounts?.[0];

    return Response.json({
      accountHolderId: accountHolder.id,
      balanceAccountId: balanceAccount?.id || "",
      legalEntityId: accountHolder.legalEntityId,
      email,
      companyName: accountHolder.description || "Business",
    });
  } catch (error) {
    return Response.json(
      { error: error.message || "Login failed.", details: error.response || null },
      { status: error.status || 500 }
    );
  }
}

