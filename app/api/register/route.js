import { adyenLemRequest, adyenPlatformRequest } from "@/lib/adyen";

export async function POST(request) {
  try {
    const { email, companyName, timezone } = await request.json();
    if (!email || !companyName || !timezone) {
      return Response.json({ error: "Email, company name, and timezone are required." }, { status: 400 });
    }

    const legalEntity = await adyenLemRequest("/legalEntities", "POST", {
      type: "organization",
      organization: { legalName: companyName },
      country: "US",
    });

    const accountHolder = await adyenPlatformRequest("/accountHolders", "POST", {
      balancePlatform: process.env.ADYEN_BALANCE_PLATFORM,
      legalEntityId: legalEntity.id,
      reference: email,
      description: companyName,
    });

    const balanceAccount = await adyenPlatformRequest("/balanceAccounts", "POST", {
      accountHolderId: accountHolder.id,
      timeZone: timezone,
      defaultCurrencyCode: "USD",
      description: `${companyName} Operating Account`,
    });

    return Response.json({
      accountHolderId: accountHolder.id,
      balanceAccountId: balanceAccount.id,
      legalEntityId: legalEntity.id,
      email,
      companyName,
    });
  } catch (error) {
    return Response.json(
      { error: error.message || "Registration failed.", details: error.response || null },
      { status: error.status || 500 }
    );
  }
}

