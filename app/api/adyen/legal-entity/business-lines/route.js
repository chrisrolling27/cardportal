import { adyenLemRequest } from "@/lib/adyen";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const legalEntityId = searchParams.get("legalEntityId");
    if (!legalEntityId) return Response.json({ error: "legalEntityId is required." }, { status: 400 });

    const data = await adyenLemRequest(`/legalEntities/${legalEntityId}/businessLines`, "GET");
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: error.message || "Failed to fetch business lines.", details: error.response || null },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { legalEntityId, industryCode, webAddress, description } = await request.json();
    if (!legalEntityId) return Response.json({ error: "legalEntityId is required." }, { status: 400 });

    const data = await adyenLemRequest("/businessLines", "POST", {
      legalEntityId,
      industryCode,
      webAddress,
      sourceOfFunds: {
        type: "business",
        description,
      },
    });

    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: error.message || "Failed to create business line.", details: error.response || null },
      { status: error.status || 500 }
    );
  }
}

