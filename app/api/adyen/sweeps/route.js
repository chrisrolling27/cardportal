import { adyenPlatformRequest } from "@/lib/adyen";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const balanceAccountId = searchParams.get("balanceAccountId");
    if (!balanceAccountId) return Response.json({ error: "balanceAccountId is required." }, { status: 400 });
    const data = await adyenPlatformRequest(`/balanceAccounts/${balanceAccountId}/sweeps`, "GET");
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: error.message || "Failed to fetch sweeps.", details: error.response || null },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request) {
  try {
    const {
      balanceAccountId,
      transferInstrumentId,
      type,
      scheduleType,
      cronExpression,
      targetAmount,
      triggerAmount,
      currency,
    } = await request.json();

    if (!balanceAccountId || !transferInstrumentId) {
      return Response.json({ error: "balanceAccountId and transferInstrumentId are required." }, { status: 400 });
    }

    const schedule =
      scheduleType === "cron"
        ? { type: "cron", expression: cronExpression || "0 0 * * *" }
        : { type: scheduleType || "daily" };

    const body = {
      counterparty: { transferInstrumentId },
      currency: currency || "USD",
      schedule,
      type: type || "push",
      status: "active",
      triggerAmount: {
        value: Number(triggerAmount || 0),
        currency: currency || "USD",
      },
    };

    if ((type || "push") === "push") {
      body.targetAmount = {
        value: Number(targetAmount || 0),
        currency: currency || "USD",
      };
    }

    const data = await adyenPlatformRequest(
      `/balanceAccounts/${balanceAccountId}/sweeps`,
      "POST",
      body
    );
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: error.message || "Failed to create sweep.", details: error.response || null },
      { status: error.status || 500 }
    );
  }
}

