import { adyenCheckoutRequest } from "@/lib/adyen";

export async function POST(request) {
  try {
    const { amount, currency, reference, paymentMethod, browserInfo, origin, returnUrl } = await request.json();

    if (!paymentMethod) {
      return Response.json({ error: "paymentMethod is required." }, { status: 400 });
    }

    if (!amount || Number(amount) <= 0) {
      return Response.json({ error: "amount must be greater than 0." }, { status: 400 });
    }

    const data = await adyenCheckoutRequest("/payments", "POST", {
      merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT,
      amount: {
        value: Number(amount),
        currency: currency || "USD",
      },
      reference,
      paymentMethod,
      browserInfo,
      channel: "Web",
      shopperInteraction: "Ecommerce",
      origin,
      returnUrl: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/checkout`,
    });

    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: error.message || "Payment failed", details: error.response || null },
      { status: error.status || 500 }
    );
  }
}

