import { adyenCheckoutRequest } from "@/lib/adyen";

export async function POST(request) {
  try {
    const { amount, currency } = await request.json().catch(() => ({}));
    const requestId = crypto.randomUUID();
    const amountValue = Number(amount) || 1000;
    const currencyCode = currency || "USD";

    console.info("[checkout][paymentMethods][request]", {
      requestId,
      amount: amountValue,
      currency: currencyCode,
      merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT || "",
    });

    const data = await adyenCheckoutRequest("/paymentMethods", "POST", {
      merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT,
      channel: "Web",
      countryCode: "US",
      allowedPaymentMethods: ["scheme"],
      amount: {
        value: amountValue,
        currency: currencyCode,
      },
    });

    console.info("[checkout][paymentMethods][response]", {
      requestId,
      paymentMethodsCount: Array.isArray(data?.paymentMethods) ? data.paymentMethods.length : 0,
      storedPaymentMethodsCount: Array.isArray(data?.storedPaymentMethods) ? data.storedPaymentMethods.length : 0,
    });

    return Response.json(data);
  } catch (error) {
    console.error("[checkout][paymentMethods][error]", {
      message: error?.message || "Failed to load payment methods",
      status: error?.status || 500,
      details: error?.response || null,
    });
    return Response.json(
      { error: error.message || "Failed to load payment methods", details: error.response || null },
      { status: error.status || 500 }
    );
  }
}

