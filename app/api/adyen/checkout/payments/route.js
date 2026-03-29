import { adyenCheckoutRequest } from "@/lib/adyen";

export async function POST(request) {
  try {
    const {
      amount,
      currency,
      reference,
      stateData,
      paymentMethod,
      browserInfo,
      origin,
      returnUrl,
    } = await request.json();
    const requestId = crypto.randomUUID();
    const amountValue = Number(amount);
    const currencyCode = currency || "USD";
    const resolvedStateData = stateData && typeof stateData === "object" ? stateData : {};
    const resolvedPaymentMethod = resolvedStateData.paymentMethod || paymentMethod || null;
    const resolvedBrowserInfo = resolvedStateData.browserInfo || browserInfo || undefined;
    const resolvedOrigin = origin || resolvedStateData.origin || "";
    const resolvedReturnUrl = returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/checkout`;

    if (!resolvedPaymentMethod) {
      return Response.json({ error: "paymentMethod is required." }, { status: 400 });
    }

    if (!amount || amountValue <= 0) {
      return Response.json({ error: "amount must be greater than 0." }, { status: 400 });
    }

    console.info("[checkout][payments][request]", {
      requestId,
      reference,
      amount: amountValue,
      currency: currencyCode,
      paymentMethodType: resolvedPaymentMethod?.type || "",
      paymentMethodKeys: Object.keys(resolvedPaymentMethod || {}),
      hasBrowserInfo: Boolean(resolvedBrowserInfo),
      origin: resolvedOrigin,
      returnUrl: resolvedReturnUrl,
    });

    const payload = {
      ...resolvedStateData,
      merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT,
      countryCode: "US",
      amount: {
        value: amountValue,
        currency: currencyCode,
      },
      reference,
      paymentMethod: resolvedPaymentMethod,
      browserInfo: resolvedBrowserInfo,
      channel: "Web",
      shopperInteraction: "Ecommerce",
      shopperReference: "demo-shopper",
      origin: resolvedOrigin,
      returnUrl: resolvedReturnUrl,
      additionalData: {
        customRoutingFlag: "adyenIssuedCard",
      },
    };

    const data = await adyenCheckoutRequest("/payments", "POST", payload);

    console.info("[checkout][payments][response]", {
      requestId,
      resultCode: data?.resultCode || "",
      pspReference: data?.pspReference || "",
      actionType: data?.action?.type || "",
      refusalReason: data?.refusalReason || "",
    });

    return Response.json(data);
  } catch (error) {
    console.error("[checkout][payments][error]", {
      message: error?.message || "Payment failed",
      status: error?.status || 500,
      details: error?.response || null,
    });
    return Response.json(
      { error: error.message || "Payment failed", details: error.response || null },
      { status: error.status || 500 }
    );
  }
}

