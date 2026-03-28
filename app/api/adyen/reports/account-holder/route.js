import { adyenPlatformRequest } from "@/lib/adyen";

export async function GET() {
  try {
    const reportsAccountHolderId = process.env.REPORTS_ACCOUNTHOLDER_ID;
    const data = await adyenPlatformRequest(`/accountHolders/${reportsAccountHolderId}`, "GET");
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: error.message || "Failed to fetch reports account holder.", details: error.response || null },
      { status: error.status || 500 }
    );
  }
}

