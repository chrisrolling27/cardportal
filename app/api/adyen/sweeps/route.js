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
      accountHolderId,
      balanceAccountId,
      transferInstrumentId,
      scheduleType,
      amount,
      currency,
    } = await request.json();

    if (!accountHolderId || !balanceAccountId || !transferInstrumentId) {
      return Response.json(
        { error: "accountHolderId, balanceAccountId and transferInstrumentId are required." },
        { status: 400 }
      );
    }

    const allowedScheduleTypes = ["daily", "weekly", "monthly", "balance"];
    const selectedSchedule = String(scheduleType || "daily");
    if (!allowedScheduleTypes.includes(selectedSchedule)) {
      return Response.json(
        { error: "scheduleType must be one of: daily, weekly, monthly, balance." },
        { status: 400 }
      );
    }

    const amountMajor = Number(amount);
    if (!Number.isFinite(amountMajor) || amountMajor < 1 || amountMajor > 1000) {
      return Response.json({ error: "amount must be between 1 and 1000." }, { status: 400 });
    }

    const accountHolder = await adyenPlatformRequest(
      `/accountHolders/${encodeURIComponent(accountHolderId)}`,
      "GET"
    );
    const capability = accountHolder?.capabilities?.sendToTransferInstrument;
    const eligibleTransferInstrumentIds = (capability?.transferInstruments || [])
      .filter((instrument) => instrument?.id && instrument?.allowed !== false)
      .map((instrument) => instrument.id);

    if (!capability?.allowed) {
      return Response.json(
        { error: "Account holder does not have sendToTransferInstrument capability." },
        { status: 400 }
      );
    }

    if (!eligibleTransferInstrumentIds.includes(transferInstrumentId)) {
      return Response.json(
        { error: "Selected transfer instrument is not eligible for sendToTransferInstrument capability." },
        { status: 400 }
      );
    }

    const sweepCurrency = currency || "USD";
    const amountMinor = Math.round(amountMajor * 100);
    const schedule = { type: selectedSchedule };

    const body = {
      counterparty: { transferInstrumentId },
      currency: sweepCurrency,
      schedule,
      type: "push",
      status: "active",
      targetAmount: {
        value: amountMinor,
        currency: sweepCurrency,
      },
    };

    if (selectedSchedule === "balance") {
      body.triggerAmount = {
        value: amountMinor,
        currency: sweepCurrency,
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

