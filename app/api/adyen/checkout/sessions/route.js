import { adyenCheckoutRequest } from "@/lib/adyen";

export async function POST(request) {
  try {
    const { amount, currency, reference, returnUrl } = await request.json();

    const data = await adyenCheckoutRequest("/sessions", "POST", {
      merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT,
      amount: {
        value: amount,
        currency: currency || "USD",
      },
      reference,
      returnUrl: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/checkout`,
      countryCode: "US",
      shopperReference: "demo-shopper",
      channel: "Web",
      additionalData: {
        customRoutingFlag: "adyenIssuedTestCard",
      },
    });

    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: error.message || "Session creation failed", details: error.response || null },
      { status: error.status || 500 }
    );
  }
}

