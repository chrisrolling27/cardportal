import { adyenPlatformRequest } from "@/lib/adyen";

const DEFAULT_BALANCE_ACCOUNT_TIME_ZONE = "America/Chicago";
const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function pickPrimaryBalanceAccount(balanceAccounts) {
  if (!Array.isArray(balanceAccounts) || !balanceAccounts.length) return null;
  return (
    balanceAccounts.find((ba) => String(ba?.status || "").toLowerCase() === "active") || balanceAccounts[0]
  );
}

function normalizeReferenceEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function resolveProvisioningLegalEntityId() {
  const explicitLegalEntityId = String(process.env.LOGIN_PROVISIONING_LEGAL_ENTITY_ID || "").trim();
  if (explicitLegalEntityId) return explicitLegalEntityId;

  const knownAccountHolderId = String(process.env.KNOWN_AH || "").trim();
  if (knownAccountHolderId) {
    const knownAccountHolder = await adyenPlatformRequest(
      `/accountHolders/${encodeURIComponent(knownAccountHolderId)}`,
      "GET"
    );
    const knownLegalEntityId = String(knownAccountHolder?.legalEntityId || "").trim();
    if (knownLegalEntityId) return knownLegalEntityId;
  }

  const error = new Error(
    "Unable to provision a new account holder. Configure LOGIN_PROVISIONING_LEGAL_ENTITY_ID (or KNOWN_AH with a valid legalEntityId)."
  );
  error.status = 500;
  throw error;
}

export async function findAccountHolderByReference(email) {
  const normalizedEmail = normalizeReferenceEmail(email);
  if (!normalizedEmail || !SIMPLE_EMAIL_REGEX.test(normalizedEmail)) return null;

  let response;
  try {
    response = await adyenPlatformRequest(
      `/accountHolders?reference=${encodeURIComponent(normalizedEmail)}`,
      "GET"
    );
  } catch (error) {
    const errorMessage = String(error?.message || "").toLowerCase();
    // Some Adyen environments can return a not-found style error for a missing reference
    // instead of an empty list. Treat that as a lookup miss so we can auto-provision.
    if (error?.status === 404 || errorMessage.includes("not found")) {
      return null;
    }
    throw error;
  }

  const candidates = Array.isArray(response?.accountHolders)
    ? response.accountHolders
    : Array.isArray(response?.data)
      ? response.data
      : [];

  return (
    candidates.find((accountHolder) => normalizeReferenceEmail(accountHolder?.reference) === normalizedEmail) ||
    candidates[0] ||
    null
  );
}

export async function createAccountHolderForReference(email) {
  const normalizedEmail = normalizeReferenceEmail(email);
  if (!normalizedEmail || !SIMPLE_EMAIL_REGEX.test(normalizedEmail)) {
    const error = new Error("A valid email is required.");
    error.status = 400;
    throw error;
  }

  const balancePlatform = String(process.env.ADYEN_BALANCE_PLATFORM || "").trim();
  if (!balancePlatform) {
    const error = new Error("ADYEN_BALANCE_PLATFORM is not configured in environment.");
    error.status = 500;
    throw error;
  }

  const legalEntityId = await resolveProvisioningLegalEntityId();
  return adyenPlatformRequest("/accountHolders", "POST", {
    balancePlatform,
    legalEntityId,
    reference: normalizedEmail,
    description: normalizedEmail,
  });
}

export async function loginOrProvisionSessionByReference(email) {
  const existingAccountHolder = await findAccountHolderByReference(email);
  if (existingAccountHolder?.id) {
    return hydrateSessionFromAccountHolderId(existingAccountHolder.id);
  }

  const createdAccountHolder = await createAccountHolderForReference(email);
  if (!createdAccountHolder?.id) {
    const error = new Error("Account holder creation succeeded but no account holder ID was returned.");
    error.status = 502;
    throw error;
  }

  // Hydration creates a BA when needed and returns a full session payload for memory/localStorage.
  return hydrateSessionFromAccountHolderId(createdAccountHolder.id);
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
