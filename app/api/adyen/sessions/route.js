import { adyenSessionRequest } from "@/lib/adyen";

export async function POST(request) {
  try {
    const { accountHolderId, legalEntityId, roles, product } = await request.json();

    const body = {
      allowOrigin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      product: product || "platform",
      policy: {
        resources: [],
        roles: roles || [],
      },
    };

    if (accountHolderId) {
      body.policy.resources.push({
        accountHolderId,
        type: "accountHolder",
      });
    }

    if (legalEntityId) {
      body.policy.resources.push({
        legalEntityId,
        type: "legalEntity",
      });
    }

    const data = await adyenSessionRequest("/sessions", "POST", body);
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: error.message || "Session creation failed", details: error.response || null },
      { status: error.status || 500 }
    );
  }
}

