import { adyenPlatformRequest } from "@/lib/adyen";

export async function PATCH(request, { params }) {
  try {
    const { status } = await request.json();
    if (!status) return Response.json({ error: "status is required." }, { status: 400 });
    const data = await adyenPlatformRequest(`/paymentInstruments/${params.id}`, "PATCH", { status });
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: error.message || "Failed to update card.", details: error.response || null },
      { status: error.status || 500 }
    );
  }
}

