export function formatCurrency(minorValue = 0, currency = "USD") {
  const major = Number(minorValue || 0) / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(major);
}

export function formatDate(dateLike) {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

export function formatTime(dateLike) {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString();
}

export function generateOrderReference() {
  return `order_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

export function endpointFromProxy(url = "") {
  if (!url.startsWith("/api/")) return url;
  const clean = url.replace("/api/adyen", "");
  if (clean.startsWith("/checkout/sessions")) return "/v71/sessions";
  if (clean.startsWith("/checkout/payment-methods")) return "/v71/paymentMethods";
  if (clean.startsWith("/checkout/payments")) return "/v71/payments";
  if (clean.startsWith("/sessions")) return "/authe/api/v1/sessions";
  if (clean.startsWith("/cards")) return "/bcl/v2/paymentInstruments";
  if (clean.startsWith("/capital/grants")) return "/btl/v4/grants";
  if (clean.startsWith("/transfers")) return "/btl/v4/transfers";
  if (clean.startsWith("/sweeps")) return "/bcl/v2/balanceAccounts/{id}/sweeps";
  if (clean.startsWith("/hosted-onboarding")) return "/lem/v4/legalEntities/{id}/onboardingLinks";
  if (clean.startsWith("/legal-entity/business-lines")) return "/lem/v3/businessLines";
  if (clean.startsWith("/legal-entity")) return "/lem/v3/legalEntities";
  if (clean.startsWith("/reports/account-holder")) return "/bcl/v2/accountHolders/{reportsAhId}";
  if (clean.startsWith("/reports/balance-accounts")) return "/bcl/v2/accountHolders/{reportsAhId}/balanceAccounts";
  if (url === "/api/login") return "/bcl/v2/accountHolders?reference={email}";
  return clean || url;
}

export function extractDetail(endpoint, response) {
  if (!response) return "—";

  if (response.error || response.errorCode) {
    return `FAILED: ${response.message || response.error || "Unknown error"}`;
  }

  if (endpoint.includes("accountHolders")) {
    if (response.id) return `AH: ${response.id}, Status: ${response.status || "created"}`;
    if (Array.isArray(response.accountHolders)) return `${response.accountHolders.length} AH result(s)`;
    return "AH lookup";
  }

  if (endpoint.includes("paymentInstruments")) {
    if (response.id) return `PI: ${response.id}, Last4: ${response.card?.lastFour || "—"}`;
    if (response.paymentInstruments) return `${response.paymentInstruments.length} card(s) found`;
    return "Card operation";
  }

  if (endpoint.includes("/payments") || endpoint.includes("/sessions")) {
    if (response.resultCode || response.pspReference) {
      return `${response.resultCode || "—"}, PSP: ${response.pspReference || "—"}`;
    }
    if (response.id) return `Session created: ${response.id.slice(0, 12)}...`;
  }

  if (endpoint.includes("legalEntities")) {
    if (response.id) return `LE: ${response.id}`;
    return "LE operation";
  }

  if (endpoint.includes("grants")) {
    if (Array.isArray(response.data)) return `${response.data.length} grant(s)`;
    if (response.id) return `Grant: ${response.id}`;
    return "Grant operation";
  }

  if (endpoint.includes("sweeps")) {
    if (response.id) return `Sweep: ${response.id}, Type: ${response.type}`;
    if (Array.isArray(response.sweeps)) return `${response.sweeps.length} sweep(s)`;
    return "Sweep operation";
  }

  if (endpoint.includes("balanceAccounts")) {
    if (response.id) return `BA: ${response.id}`;
    if (response.balanceAccounts) return `${response.balanceAccounts.length} BA(s)`;
    return "BA operation";
  }

  if (endpoint.includes("businessLines")) {
    if (response.id) return `BL: ${response.id}`;
    if (Array.isArray(response.businessLines)) return `${response.businessLines.length} business line(s)`;
    return "Business line operation";
  }

  return JSON.stringify(response).slice(0, 60) + "...";
}

export async function copyText(text) {
  await navigator.clipboard.writeText(String(text || ""));
}

