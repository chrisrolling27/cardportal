import { adyenCheckoutRequest } from "@/lib/adyen";

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body?.details && !body?.paymentData) {
      return Response.json(
        { error: "details or paymentData payload is required." },
        { status: 400 }
      );
    }

    const data = await adyenCheckoutRequest("/payments/details", "POST", body);
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: error.message || "Payment details call failed", details: error.response || null },
      { status: error.status || 500 }
    );
  }
}
