import { adyenSessionRequest } from "@/lib/adyen";

export async function POST(request) {
  try {
    const { legalEntityId } = await request.json();
    if (!legalEntityId) return Response.json({ error: "legalEntityId is required." }, { status: 400 });

    const data = await adyenSessionRequest("/sessions", "POST", {
      allowOrigin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      product: "onboarding",
      policy: {
        resources: [{ legalEntityId, type: "legalEntity" }],
        roles: ["Manage Verification: View", "Manage Verification: Edit"],
      },
    });

    return Response.json({
      ...data,
      onboardingUrl:
        data.url ||
        data.redirectUrl ||
        (data.token
          ? `https://test.adyen.com/onboarding?token=${encodeURIComponent(data.token)}`
          : null),
    });
  } catch (error) {
    return Response.json(
      { error: error.message || "Failed to create onboarding session.", details: error.response || null },
      { status: error.status || 500 }
    );
  }
}

