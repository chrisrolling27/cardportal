import { adyenLemV4Request, adyenPlatformRequest } from "@/lib/adyen";

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

const ACCOUNT_HOLDERS_PAGE_SIZE = 100;
const ACCOUNT_HOLDERS_MAX_PAGES = 100;
const LEGAL_ENTITY_REFERENCE_MAX_LEN = 150;

function legalEntityReferenceFromEmail(normalizedEmail) {
  const email = String(normalizedEmail || "").trim();
  if (!email) return "";
  return email.length > LEGAL_ENTITY_REFERENCE_MAX_LEN
    ? email.slice(0, LEGAL_ENTITY_REFERENCE_MAX_LEN)
    : email;
}

async function createLegalEntityV4ForLoginReference(normalizedEmail) {
  const reference = legalEntityReferenceFromEmail(normalizedEmail);
  const body = {
    type: "organization",
    reference,
    organization: {
      legalName: "Exploration Company",
      registrationNumber: "",
      type: "privateCompany",
      registeredAddress: {
        city: "Milwaukee",
        country: "US",
        postalCode: "53202",
        stateOrProvince: "WI",
        street: "456 Water Street",
        street2: "13th floor",
      },
    },
  };

  const created = await adyenLemV4Request("/legalEntities", "POST", body);
  const id = String(created?.id || "").trim();
  if (!id) {
    const error = new Error("Legal entity creation succeeded but no legal entity ID was returned.");
    error.status = 502;
    throw error;
  }
  const referenceFromLe = String(created?.reference || "").trim() || reference;
  return { id, reference: referenceFromLe };
}

function accountHolderMatchesLoginEmail(accountHolder, normalizedEmail) {
  if (!normalizedEmail) return false;
  const ref = normalizeReferenceEmail(accountHolder?.reference);
  const desc = normalizeReferenceEmail(accountHolder?.description);
  return ref === normalizedEmail || desc === normalizedEmail;
}

async function listAllAccountHoldersForBalancePlatform() {
  const balancePlatform = String(process.env.ADYEN_BALANCE_PLATFORM || "").trim();
  if (!balancePlatform) {
    const error = new Error("ADYEN_BALANCE_PLATFORM is not configured in environment.");
    error.status = 500;
    throw error;
  }

  const all = [];
  let offset = 0;

  for (let page = 0; page < ACCOUNT_HOLDERS_MAX_PAGES; page += 1) {
    const path = `/balancePlatforms/${encodeURIComponent(balancePlatform)}/accountHolders?limit=${ACCOUNT_HOLDERS_PAGE_SIZE}&offset=${offset}`;
    const response = await adyenPlatformRequest(path, "GET");
    const batch = Array.isArray(response?.accountHolders)
      ? response.accountHolders
      : Array.isArray(response?.data)
        ? response.data
        : [];

    all.push(...batch);
    if (batch.length < ACCOUNT_HOLDERS_PAGE_SIZE) break;
    offset += ACCOUNT_HOLDERS_PAGE_SIZE;
  }

  return all;
}

export async function findAccountHolderByReference(email) {
  const normalizedEmail = normalizeReferenceEmail(email);
  if (!normalizedEmail || !SIMPLE_EMAIL_REGEX.test(normalizedEmail)) return null;

  try {
    const accountHolders = await listAllAccountHoldersForBalancePlatform();
    return accountHolders.find((ah) => accountHolderMatchesLoginEmail(ah, normalizedEmail)) || null;
  } catch (error) {
    const errorMessage = String(error?.message || "").toLowerCase();
    if (error?.status === 404 || errorMessage.includes("not found")) {
      return null;
    }
    throw error;
  }
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

  const legalEntity = await createLegalEntityV4ForLoginReference(normalizedEmail);
  const ahReference = String(legalEntity.reference || "").trim() || normalizedEmail;
  return adyenPlatformRequest("/accountHolders", "POST", {
    balancePlatform,
    legalEntityId: legalEntity.id,
    reference: ahReference,
    description: ahReference,
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
