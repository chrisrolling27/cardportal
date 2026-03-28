import { adyenPlatformRequest } from "@/lib/adyen";

const DEFAULT_BALANCE_ACCOUNT_TIME_ZONE = "America/Chicago";

function pickPrimaryBalanceAccount(balanceAccounts) {
  if (!Array.isArray(balanceAccounts) || !balanceAccounts.length) return null;
  return (
    balanceAccounts.find((ba) => String(ba?.status || "").toLowerCase() === "active") || balanceAccounts[0]
  );
}

export async function hydrateSessionFromAccountHolderId(accountHolderId) {
  const normalizedAccountHolderId = String(accountHolderId || "").trim();
  if (!normalizedAccountHolderId) {
    const error = new Error("Missing account holder ID.");
    error.status = 400;
    throw error;
  }

  // This is the critical first call: all session data derives from this account holder payload.
  const accountHolder = await adyenPlatformRequest(
    `/accountHolders/${encodeURIComponent(normalizedAccountHolderId)}`,
    "GET"
  );

  const legalEntityId = String(accountHolder?.legalEntityId || "").trim();
  if (!legalEntityId) {
    const error = new Error("Account holder is missing legalEntityId required for onboarding.");
    error.status = 422;
    throw error;
  }

  const fetchBalanceAccounts = async () => {
    const balanceAccountsResponse = await adyenPlatformRequest(
      `/accountHolders/${encodeURIComponent(accountHolder.id)}/balanceAccounts`,
      "GET"
    );
    return balanceAccountsResponse?.balanceAccounts || [];
  };

  let balanceAccounts = await fetchBalanceAccounts();

  // Create only when there are no existing balance accounts for this account holder.
  if (!balanceAccounts.length) {
    await adyenPlatformRequest("/balanceAccounts", "POST", {
      accountHolderId: accountHolder.id,
      timeZone: DEFAULT_BALANCE_ACCOUNT_TIME_ZONE,
      defaultCurrencyCode: "USD",
      description: `${accountHolder.description || "Business"} Operating Account`,
    });
    balanceAccounts = await fetchBalanceAccounts();
  }

  const balanceAccount = pickPrimaryBalanceAccount(balanceAccounts);

  return {
    accountHolderId: accountHolder.id,
    balanceAccountId: balanceAccount?.id || "",
    legalEntityId,
    email: accountHolder.reference || "",
    companyName: accountHolder.description || "Business",
    capabilities: accountHolder.capabilities || {},
    accountHolderStatus: accountHolder.status || "",
    balanceAccounts,
  };
}
