import { adyenTransfersRequest } from "@/lib/adyen";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountHolderId = searchParams.get("accountHolderId");
    const query = accountHolderId
      ? `?accountHolderId=${encodeURIComponent(accountHolderId)}`
      : "";
    const data = await adyenTransfersRequest(`/transfers${query}`, "GET");
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: error.message || "Failed to fetch transfers.", details: error.response || null },
      { status: error.status || 500 }
    );
  }
}

