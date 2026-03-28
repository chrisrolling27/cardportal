import { adyenLemV4Request } from "@/lib/adyen";

export async function POST(request) {
  try {
    const { legalEntityId } = await request.json();
    if (!legalEntityId) return Response.json({ error: "legalEntityId is required." }, { status: 400 });

    const appUrl = String(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").trim();
    const redirectUrl = `${appUrl}/onboarding`;
    const data = await adyenLemV4Request(
      `/legalEntities/${encodeURIComponent(legalEntityId)}/onboardingLinks`,
      "POST",
      { redirectUrl }
    );

    return Response.json({
      ...data,
      onboardingUrl: data.url || null,
    });
  } catch (error) {
    return Response.json(
      { error: error.message || "Failed to create onboarding session.", details: error.response || null },
      { status: error.status || 500 }
    );
  }
}

