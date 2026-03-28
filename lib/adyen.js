const ADYEN_BASE_URL = "https://balanceplatform-api-test.adyen.com/bcl/v2";
const ADYEN_LEM_URL = "https://kyc-test.adyen.com/lem/v3";
const ADYEN_LEM_V4_URL = "https://kyc-test.adyen.com/lem/v4";
const ADYEN_CHECKOUT_URL = "https://checkout-test.adyen.com/v71";
const ADYEN_TRANSFERS_URL = "https://balanceplatform-api-test.adyen.com/btl/v4";
const ADYEN_SESSION_URL = "https://test.adyen.com/authe/api/v1";

async function request(baseUrl, path, method = "GET", body, apiKey) {
  if (!apiKey) {
    const missingKeyError = new Error("Missing API key for Adyen request.");
    missingKeyError.status = 500;
    throw missingKeyError;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const responseText = await response.text();
  let data = null;
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch (_error) {
    data = { message: responseText || "No response body returned." };
  }

  if (!response.ok) {
    const errorMessage =
      data?.message ||
      data?.error ||
      `${response.status} ${response.statusText}` ||
      "Adyen API request failed.";
    const error = new Error(errorMessage);
    error.status = response.status;
    error.response = data;
    throw error;
  }

  return data;
}

export async function adyenPlatformRequest(path, method = "GET", body) {
  return request(
    ADYEN_BASE_URL,
    path,
    method,
    body,
    process.env.ADYEN_PLATFORM_API_KEY
  );
}

export async function adyenLemRequest(path, method = "GET", body) {
  return request(
    ADYEN_LEM_URL,
    path,
    method,
    body,
    process.env.ADYEN_PLATFORM_API_KEY
  );
}

export async function adyenLemV4Request(path, method = "GET", body) {
  return request(
    ADYEN_LEM_V4_URL,
    path,
    method,
    body,
    process.env.ADYEN_PLATFORM_API_KEY
  );
}

export async function adyenCheckoutRequest(path, method = "GET", body) {
  return request(
    ADYEN_CHECKOUT_URL,
    path,
    method,
    body,
    process.env.ADYEN_PAYMENTS_API_KEY
  );
}

export async function adyenTransfersRequest(path, method = "GET", body) {
  return request(
    ADYEN_TRANSFERS_URL,
    path,
    method,
    body,
    process.env.ADYEN_PLATFORM_API_KEY
  );
}

export async function adyenSessionRequest(path, method = "GET", body) {
  return request(
    ADYEN_SESSION_URL,
    path,
    method,
    body,
    process.env.ADYEN_PLATFORM_API_KEY
  );
}

