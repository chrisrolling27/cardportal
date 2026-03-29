# Cursor Prompt — CardPortal (Full Build v3)

## Project Overview

Build a **Next.js 14 App Router** project called `card-portal` using **React, Tailwind CSS, and JavaScript** (not TypeScript). This is a demo app for Adyen's Balance Platform / Card Issuing product. It will be deployed on **Vercel free tier** — meaning **no persistent server-side state, no database, no sessions**. All state is derived from Adyen API calls at request time. The user's email address is the lookup key (stored in the `reference` field of the Adyen AccountHolder object).

---

## Tech Stack & Setup

- **Next.js 14** with App Router (`/app` directory)
- **React 18** (standard JS, no TypeScript)
- **Tailwind CSS** for all styling
- **@adyen/adyen-platform-experience-web** — Adyen's Platform Experience components (Transactions, Payouts, Capital)
- **Vercel deployment** (free tier, no persistent storage)
- Use **Next.js API routes** (`/app/api/...`) as a backend proxy so the Adyen API key never reaches the client

### `.env.local`

```properties
PORT=3000

ADYEN_PLATFORM_API_KEY=""
ADYEN_PAYMENTS_API_KEY=""
NEXT_PUBLIC_ADYEN_CLIENT_KEY="test_..."
ADYEN_MERCHANT_ACCOUNT="ChrisRollingCompany_US_PLATFORM_TEST"
ADYEN_BALANCE_PLATFORM="CGRPlatform"

REPORTS_ACCOUNTHOLDER_ID="AH32CNB22322885LGZLFL8XL6"
SPECIAL_BA="BA32CPV22322885LGZLFLDQR8"

NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Create a `.env.example` file with the same keys but blank values for reference.

### NPM Dependencies

```bash
npm install @adyen/adyen-platform-experience-web @adyen/adyen-web
```

---

## Architecture & Key Patterns

### No Database — Adyen IS the Database

- **Login**: User enters email → app calls the API proxy which hits `GET /bcl/v2/accountHolders?reference={email}` to look up the account holder. If found, proceed. If not, prompt to register.
- **Registration**: Creates legal entity, account holder, and balance account via Adyen APIs. Email stored in `reference` field.
- **Session**: After login/register, store `accountHolderId`, `balanceAccountId`, `legalEntityId`, `email`, and `companyName` in React context AND localStorage. On page load, check localStorage first, validate the AH exists, restore session. On logout, clear both.

### API Proxy Pattern

Every Adyen API call goes through a Next.js API route. Create shared utilities at `/lib/adyen.js`:

```javascript
const ADYEN_BASE_URL = 'https://balanceplatform-api-test.adyen.com/bcl/v2';
const ADYEN_LEM_URL = 'https://kyc-test.adyen.com/lem/v3';
const ADYEN_CHECKOUT_URL = 'https://checkout-test.adyen.com/v71';
const ADYEN_TRANSFERS_URL = 'https://balanceplatform-api-test.adyen.com/btl/v4';
const ADYEN_SESSION_URL = 'https://test.adyen.com/authe/api/v1';

// One helper per API domain: adyenPlatformRequest, adyenLemRequest, adyenCheckoutRequest, adyenTransfersRequest, adyenSessionRequest
// All follow the same pattern: fetch with X-API-Key header from env, JSON parse, throw on error
```

The `adyenSessionRequest` helper uses `ADYEN_PLATFORM_API_KEY` and hits the Session Authentication API for creating component session tokens.

### API History Tracking

Create `ApiHistoryContext` that logs every API call. Provide `trackedFetch(url, options)` wrapper. Every client-side API call must use `trackedFetch`. Each log entry captures: timestamp, HTTP method, the Adyen API path (extracted from internal proxy path), request body, response body, HTTP status code, and a human-readable "detail" string summarizing the key info returned.

### Adyen Platform Experience Session Token Pattern

Several tabs use Adyen's embedded Platform Experience components (Transactions, Payouts, Capital). All require a **session token** created server-side. Create a reusable API route at `/app/api/adyen/sessions/route.js` that accepts parameters and calls:

```
POST https://test.adyen.com/authe/api/v1/sessions
```

Request body structure:
```json
{
  "allowOrigin": "https://your-deployed-domain.com",
  "product": "platform",
  "policy": {
    "resources": [
      {
        "accountHolderId": "<accountHolderId>",
        "type": "accountHolder"
      }
    ],
    "roles": ["Transactions Overview Component: View", "Payouts Overview Component: View", "Capital Overview Component: View"]
  }
}
```

**IMPORTANT**: The `allowOrigin` must match the actual domain where the app is deployed. For local development use `http://localhost:3000`. Store this in an env variable `NEXT_PUBLIC_APP_URL` so it can be configured per environment.

Add to `.env.local`:
```properties
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

The session endpoint returns `{ id, token }`. The `token` is passed to the client and used to initialize Platform Experience components.

---

## UI Design — Adyen Brand

### Color Palette (Tailwind config extend)

```javascript
colors: {
  adyen: {
    green: '#0ABF53',
    darkGreen: '#099A43',
    black: '#00112C',
    darkNavy: '#001435',
    navy: '#002855',
    white: '#FFFFFF',
    gray: {
      50: '#F7F8FA',
      100: '#EBEDF0',
      200: '#D1D5DB',
      300: '#9CA3AF',
      500: '#6B7280',
      700: '#374151',
      900: '#111827',
    }
  }
}
```

### Layout

Persistent sidebar (250px, `adyen-black` bg, white text) + main content area (`adyen-gray-50` bg).

Top-left of sidebar: Bold green "A" in a rounded square + "CardPortal" in white. The name should feel like one word — "CardPortal" — clean and fintech.

Nav items with left-border highlight on active (adyen-green). Bottom of sidebar: user email + Logout button.

Tabs: Home, Registration, Cards, Checkout, Capital, Payouts, Reports, API History.

---

## Login / Registration Page

Centered card, togglable modes.

**Login**: Email input → "Sign In" → calls lookup. **Register**: Email, Company Name, Timezone select → "Create Account" → calls orchestrated registration.

Registration shows a step indicator: "Creating legal entity... Creating account holder... Creating balance account..."

Registration API flow (single `/app/api/register/route.js`):
1. `POST /lem/v3/legalEntities` — type organization, legalName from form, country US
2. `POST /bcl/v2/accountHolders` — balancePlatform "CGRPlatform", legalEntityId from step 1, reference = email, description = company name
3. `POST /bcl/v2/balanceAccounts` — accountHolderId from step 2, timezone from form, defaultCurrencyCode USD

---

## HOME TAB — Commercial Bank Dashboard

**Route**: `/app/(dashboard)/home/page.js`

### Design Vision

This should look and feel like a **commercial bank's online banking home screen** after you log in. Think Chase, Wells Fargo, or a modern neobank like Mercury. Clean, confident, financial.

### Layout (top to bottom)

**1. Welcome Banner**
- Large greeting: "Good morning, {companyName}" (or afternoon/evening based on time)
- Subtitle: "Here's your account overview"
- Subtle gradient background using adyen navy/green

**2. Account Balance Hero**
- Prominent card showing:
  - "Available Balance" in large type: **$0.00 USD** (fetched from BA)
  - "Pending" amount in smaller muted text below
  - Account Holder ID and Balance Account ID shown discreetly as copyable chips

**3. Adyen Transactions Overview Component (embedded)**
This is the core of the home page. Embed the Adyen `TransactionsOverview` component directly.

**How to integrate:**

On page load, the client calls `/api/adyen/sessions` to get a session token scoped to the logged-in user's account holder. Then:

```javascript
import { AdyenPlatformExperience, TransactionsOverview } from '@adyen/adyen-platform-experience-web';
import "@adyen/adyen-platform-experience-web/adyen-platform-experience-web.css";

// Create a function to fetch/refresh session
const getSessionToken = async () => {
  const res = await trackedFetch('/api/adyen/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accountHolderId: user.accountHolderId,
      roles: ['Transactions Overview Component: View']
    })
  });
  return res; // returns the full session object { id, token }
};

// Initialize
const core = await AdyenPlatformExperience({ session: getSessionToken });
const transactionsOverview = new TransactionsOverview({ core });
transactionsOverview.mount('#transactions-container');
```

Create a `<div id="transactions-container">` in the page for mounting. Use a `useEffect` with cleanup to unmount on page leave.

**4. Quick Actions Row**
- Buttons: "Issue a Card" → Cards tab, "Make a Transfer" → Payouts tab, "View Reports" → Reports tab

---

## REGISTRATION TAB — Capabilities & Onboarding

**Route**: `/app/(dashboard)/registration/page.js`

### Section 1: Capabilities List

On load, fetch the **Account Holder** details:
```
GET /bcl/v2/accountHolders/{accountHolderId}
```

The response includes a `capabilities` object. Display each capability as a row:

| Name | Requested Level | Status |
|---|---|---|
| sendToTransferInstrument | ✅ | allowed / pending / notApplicable |
| issueCard | ✅ | allowed / pending |
| receivePayments | — | notApplicable |
| ... | ... | ... |

Color badges: green = `allowed`, yellow = `pending`, gray = `notApplicable`, red = `rejected` or with problems.

If a capability has `problems` or `verificationStatus` issues, show them in an expandable section below that row.

### Section 2: Hosted Onboarding Button

A prominent "Complete Onboarding" button that generates a link to Adyen's Hosted Onboarding page.

**API call** (create a route at `/app/api/adyen/hosted-onboarding/route.js`):

For Balance Platform (not classic), use the **Session Authentication API** to create an onboarding session:

```
POST https://test.adyen.com/authe/api/v1/sessions
```

```json
{
  "allowOrigin": "<NEXT_PUBLIC_APP_URL>",
  "product": "onboarding",
  "policy": {
    "resources": [
      {
        "legalEntityId": "<legalEntityId>",
        "type": "legalEntity"
      }
    ],
    "roles": ["Manage Verification: View", "Manage Verification: Edit"]
  }
}
```

However, for a simpler approach that opens Adyen's hosted page directly, use the **Hosted Onboarding API** (if available in your setup). The button should open the onboarding URL in a new tab. If using the component approach, embed the onboarding component using `@adyen/kyc-components`.

**For demo simplicity**: Generate the hosted onboarding session URL and open it in a new tab. The button text should say "Launch Hosted Onboarding →" and open in `_blank`. Add a note below: "Complete KYC verification, add bank accounts (transfer instruments), and accept Terms of Service through Adyen's hosted flow."

### Section 3: Create Business Line

A simple inline form (not modal) with:
- **Industry Code**: Text input, default `"7995"`
- **Web Address**: Text input, default `"https://example.com"`
- **Source of Funds Description**: Text input, default `"Issuing Demo"`
- **Submit** button

```
POST /lem/v3/businessLines
```
```json
{
  "legalEntityId": "<legalEntityId>",
  "industryCode": "<industryCode>",
  "webAddress": "<webAddress>",
  "sourceOfFunds": {
    "type": "business",
    "description": "<description>"
  }
}
```

Below the form, list any existing business lines fetched from:
```
GET /lem/v3/legalEntities/{legalEntityId}/businessLines
```

---

## CARDS TAB — Visual Wallet

**Route**: `/app/(dashboard)/cards/page.js`

### Design Vision

A **visual digital wallet** — think Apple Wallet or Google Pay style. Cards fanned out or in a grid, each rendered as a realistic-looking credit card visual.

### Card Visual Component

Build a `CardVisual` component that renders a realistic card:
- Rounded rectangle with gradient background (Visa = blue/navy gradient, Mastercard = dark red/orange gradient)
- Chip icon (simple gold rectangle with lines)
- Card brand logo area (top right) — "VISA" text or "MC" circles
- **Last 4 digits visible by default**: show `•••• •••• •••• 1234`
- Cardholder name at bottom left
- **Eye icon** (toggle) at bottom right

**Eye Icon Behavior**:
- Default state: Only last 4 digits shown, expiry hidden, CVC hidden
- On click: Fetch full card details via **PAN reveal** or from stored creation data
- Revealed state: Full PAN shown (formatted with spaces), expiry month/year shown, CVC shown
- The eye icon toggles between 👁 (show) and 👁‍🗨 (hide) states
- Add a subtle animation/transition when revealing (fade in the numbers)

**IMPORTANT**: Full PAN is only available at card creation time in the API response. For existing cards, the GET endpoint only returns the `lastFour`. Store the full PAN in sessionStorage on creation keyed by payment instrument ID. If not available (page refreshed, card created in prior session), show a note "Full card details only available at creation" and keep just the last 4 visible.

### Card List

Fetch on load:
```
GET /bcl/v2/balanceAccounts/{balanceAccountId}/paymentInstruments
```

Display as a grid of `CardVisual` components. Each card also shows a status badge overlay (Active = green dot, Inactive = gray, Blocked = red).

### Create Card

"+ New Card" button opens a creation form/panel:

**Fields**:
- **Brand**: Toggle buttons — "Visa" or "Mastercard"
- **Cardholder Name**: Text input (pre-fill with company name)

That's it — keep it simple for the demo.

```
POST /bcl/v2/paymentInstruments
```

**For Visa**:
```json
{
  "type": "card",
  "balanceAccountId": "<balanceAccountId>",
  "card": {
    "brand": "visa",
    "brandVariant": "visa_credit_s",
    "cardholderName": "<from form>",
    "formFactor": "virtual"
  },
  "issuingCountryCode": "US",
  "description": "CardPortal Virtual Visa Card"
}
```

**For Mastercard**:
```json
{
  "type": "card",
  "balanceAccountId": "<balanceAccountId>",
  "card": {
    "brand": "mc",
    "brandVariant": "mc_credit_mco",
    "cardholderName": "<from form>",
    "formFactor": "virtual"
  },
  "issuingCountryCode": "US",
  "description": "CardPortal Virtual Mastercard"
}
```

**After creation**: The response contains the full PAN, expiry, CVC. Store these in sessionStorage. Immediately show the new card in the wallet with the eye icon already in "revealed" state so the user can see and copy their card details. Add a "Copy PAN" button during the reveal.

### Card Status Management

Clicking a card opens a detail panel/drawer showing all metadata. Include a status dropdown:
```
PATCH /bcl/v2/paymentInstruments/{id}
```
with `{"status": "active"|"inactive"|"suspended"|"closed"}`. Confirm before closing.

---

## CHECKOUT TAB — Adyen Drop-in Component

**Route**: `/app/(dashboard)/checkout/page.js`  
**API Route**: `/app/api/adyen/checkout/sessions/route.js`

### Design Vision

A storefront checkout simulator. The top half shows a fun randomized "order summary" with a random amount. The bottom half renders the **Adyen Drop-in component** where the user enters their issued card details. This demonstrates the full acquiring/checkout flow against cards created in the Cards tab. No manual form — the Drop-in handles all card input with its own secure iframes, validation, formatting, and 3DS.

### Page Layout

**1. Simulated Order Summary (top section)**

A styled "receipt" card showing a random demo purchase:

- **Store Name**: "CardPortal Demo Store" with a shopping bag icon
- **Order Item**: Randomly selected on page load from a fun list:
  - "Premium Widget" ⚙️ / "Flux Capacitor Upgrade" ⚡ / "Cloud Storage (1TB)" ☁️ / "Artisanal Coffee Subscription" ☕ / "Quantum Computing Credits" 🔬 / "AI Training Token Pack" 🤖 / "Holographic Display Module" 📺 / "Space Tourism Voucher" 🚀
- **Amount**: Random between $1.00 and $500.00 (stored in React state)
- **Reference**: Auto-generated `order_{timestamp}_{random}`
- **"Randomize Order" button**: Generates new item + amount + remounts Drop-in with fresh session

**2. Adyen Drop-in (bottom section)**

The Drop-in renders its own card input form (number, expiry, CVC, cardholder name) inside secure iframes. It handles formatting, validation, 3DS challenges, and the payment call automatically via the session.

**3. Payment Result (appears after payment)**

- **Authorised**: Large green success card with checkmark. "Pay Again" button randomizes new order.
- **Refused**: Red failure card with refusal reason. "Try Again" button.
- **Error**: Error details with retry option.
- **Session payment history**: Table at bottom showing all attempts this session: time, item, amount, result.

### Server-Side: Create Checkout Session

```javascript
// /app/api/adyen/checkout/sessions/route.js
import { adyenCheckoutRequest } from '@/lib/adyen';

export async function POST(request) {
  try {
    const { amount, currency, reference, returnUrl } = await request.json();
    
    const data = await adyenCheckoutRequest('/sessions', 'POST', {
      merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT,
      amount: {
        value: amount,  // already in minor units from client
        currency: currency || 'USD'
      },
      reference,
      returnUrl: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/checkout`,
      countryCode: 'US',
      shopperReference: 'demo-shopper',
      channel: 'Web',
      additionalData: {
        customRoutingFlag: 'adyenIssuedCard'
      }
    });

    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: error.message || 'Session creation failed', details: error },
      { status: error.status || 500 }
    );
  }
}
```

This uses `ADYEN_PAYMENTS_API_KEY` via the `adyenCheckoutRequest` helper. The Checkout `/v71/sessions` endpoint is different from the Session Authentication API used by Platform Experience components. The `additionalData.customRoutingFlag: "adyenIssuedCard"` tells Adyen to route this payment through the issuing network — this is required when the card being charged was issued by Adyen (i.e., the cards created in the Cards tab).

### Client-Side: Mount Drop-in (v6 syntax)

The client-side flow:

1. Generate random order (item + amount)
2. Call `/api/adyen/checkout/sessions` via `trackedFetch` to create a checkout session
3. Dynamically import `@adyen/adyen-web` (client-side only, no SSR)
4. Create `AdyenCheckout` instance with the session response and `NEXT_PUBLIC_ADYEN_CLIENT_KEY`
5. Create and mount `Dropin` to a container div
6. Handle `onPaymentCompleted` and `onPaymentFailed` callbacks

```javascript
// Key initialization pattern (v6):
const { default: AdyenCheckout } = await import('@adyen/adyen-web');
const { Dropin } = await import('@adyen/adyen-web');
await import('@adyen/adyen-web/styles/adyen.css');

const checkout = await AdyenCheckout({
  environment: 'test',
  clientKey: process.env.NEXT_PUBLIC_ADYEN_CLIENT_KEY,
  session: {
    id: session.id,
    sessionData: session.sessionData
  },
  onPaymentCompleted: (result, component) => {
    // result.resultCode === 'Authorised'
    setPaymentResult({ success: true, resultCode: result.resultCode });
  },
  onPaymentFailed: (result, component) => {
    // result.resultCode === 'Refused' | 'Cancelled' | 'Error'
    setPaymentResult({ success: false, resultCode: result?.resultCode, refusalReason: result?.refusalReason });
  },
  onError: (error) => {
    setPaymentResult({ success: false, resultCode: 'Error', errorMessage: error.message });
  }
});

const dropin = new Dropin(checkout, {}).mount('#dropin-container');
```

**IMPORTANT v6 NOTES for Cursor**:
- v6 uses `new Dropin(checkout, config)` constructor, NOT `checkout.create('dropin')`
- If the v6 constructor import fails at build time, fall back to `checkout.create('dropin')` which v6 may still support for backwards compat
- Import CSS from `@adyen/adyen-web/styles/adyen.css` (v6 path) — if that fails try `@adyen/adyen-web/dist/adyen.css`
- All imports must be dynamic (`await import(...)`) because Drop-in uses browser APIs and cannot run during SSR
- Use `useEffect` with cleanup to unmount: `dropin.unmount()`
- When "Randomize Order" is clicked, unmount old dropin, create new session, remount

### Drop-in Styling Override

```css
/* In globals.css */
#dropin-container {
  --adyen-sdk-color-outline-primary: #0ABF53;
  --adyen-sdk-color-label-primary: #00112C;
}
```

### Why Drop-in Instead of Manual Form

- **Secure**: Card data entered in Adyen-hosted iframes, never touches our server
- **3DS built-in**: Handles 3D Secure challenges automatically
- **Demo value**: Shows partners what the checkout integration actually looks like
- **Less code**: One session call replaces the manual `/payments` integration

## CAPITAL TAB — Business Financing (Reports AH)

**Route**: `/app/(dashboard)/capital/page.js`

**IMPORTANT**: This tab operates on the **Reports Account Holder** (`REPORTS_ACCOUNTHOLDER_ID` from env), NOT the logged-in user. This is because capital/grants require specific eligibility that the reports AH may have.

### Section 1: Adyen Capital Component (attempt to load)

Try to embed the Adyen `CapitalOverview` component from `@adyen/adyen-platform-experience-web`:

```javascript
import { AdyenPlatformExperience, CapitalOverview } from '@adyen/adyen-platform-experience-web';
import "@adyen/adyen-platform-experience-web/adyen-platform-experience-web.css";

const getSessionToken = async () => {
  const res = await trackedFetch('/api/adyen/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accountHolderId: '<REPORTS_ACCOUNTHOLDER_ID>',
      roles: ['Capital Overview Component: View']
    })
  });
  return res;
};

const core = await AdyenPlatformExperience({ session: getSessionToken });
const capitalOverview = new CapitalOverview({ core });
capitalOverview.mount('#capital-container');
```

**Expectation**: This component may not load or may show an empty state because the account holder may not be eligible for capital. Build graceful error handling.

### Section 2: Fallback / Grants via API

If the component doesn't render, show a fallback section that uses the API directly:

```
GET /btl/v4/grants?accountHolderId=AH32CNB22322885LGZLFL8XL6
```

Display grants table if any exist. Show an informational banner: "Capital component attempted to load for the Reports Account Holder. If no data appears, this account holder may not have active capital eligibility."

### Request Grant form

```
POST /btl/v4/grants
```
```json
{
  "amount": { "value": 100000, "currency": "USD" },
  "accountHolderId": "AH32CNB22322885LGZLFL8XL6",
  "counterparty": { "balanceAccountId": "BA32CPV22322885LGZLFLDQR8" }
}
```

---

## PAYOUTS TAB — Payout Component & Sweeps

**Route**: `/app/(dashboard)/payouts/page.js`

### Section 1: Adyen Payouts Overview Component (embedded)

Embed the `PayoutsOverview` component:

```javascript
import { AdyenPlatformExperience, PayoutsOverview } from '@adyen/adyen-platform-experience-web';
import "@adyen/adyen-platform-experience-web/adyen-platform-experience-web.css";

const getSessionToken = async () => {
  const res = await trackedFetch('/api/adyen/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accountHolderId: user.accountHolderId,
      roles: ['Payouts Overview Component: View']
    })
  });
  return res;
};

const core = await AdyenPlatformExperience({ session: getSessionToken });
const payoutsOverview = new PayoutsOverview({ core });
payoutsOverview.mount('#payouts-container');
```

Mount to a container div. Handle errors gracefully — if the component fails to load (e.g., no automatic payouts configured), show a fallback message.

### Section 2: Configure Sweep

Allow the user to set up a **push sweep** from their balance account to their transfer instrument.

**Prerequisites note**: Display a notice: "To configure a sweep, you need a verified transfer instrument (bank account). You can add one through Hosted Onboarding on the Registration tab."

**Fetch existing sweeps**:
```
GET /bcl/v2/balanceAccounts/{balanceAccountId}/sweeps
```

Display existing sweeps in a table: ID, type (push/pull), status, schedule, target/sweep amount, counterparty.

**Create Sweep form**:

Fields:
- **Transfer Instrument ID**: Text input (the user enters their TI ID — they get this from hosted onboarding)
- **Sweep Type**: Toggle — `push` (payout) or `pull` (top-up)
- **Currency**: Default USD
- **Schedule Type**: Select — `daily`, `weekly`, `monthly`, `cron`, `balance`
- **Cron Expression**: Text input, only shown if schedule type is `cron`, default `"0 0 * * *"` (midnight daily)
- **Target Amount** (for push sweeps): Number input — the amount to maintain in the BA after sweep. E.g., 0 means sweep everything.
- **Trigger Amount**: Number input — the balance threshold that triggers the sweep

```
POST /bcl/v2/balanceAccounts/{balanceAccountId}/sweeps
```

Example push sweep to transfer instrument:
```json
{
  "counterparty": {
    "transferInstrumentId": "<from form>"
  },
  "currency": "USD",
  "schedule": {
    "type": "daily"
  },
  "type": "push",
  "targetAmount": {
    "value": 0,
    "currency": "USD"
  },
  "triggerAmount": {
    "value": 0,
    "currency": "USD"
  },
  "status": "active"
}
```

---

## REPORTS TAB — Platform Reports (Reports AH)

**Route**: `/app/(dashboard)/reports/page.js`

**IMPORTANT**: This tab uses the **hardcoded Reports Account Holder** from `.env` (`REPORTS_ACCOUNTHOLDER_ID` = `AH32CNB22322885LGZLFL8XL6`), NOT the logged-in user. This demonstrates the platform's ability to view cross-merchant reporting data.

### Section 1: Reports Account Holder Overview

Show an info banner: "Viewing platform-level reports for the configured Reports Account Holder."

Fetch:
```
GET /bcl/v2/accountHolders/AH32CNB22322885LGZLFL8XL6
```

Display: AH ID, description, status, legal entity ID.

### Section 2: Balance Accounts Under Reports AH

```
GET /bcl/v2/accountHolders/AH32CNB22322885LGZLFL8XL6/balanceAccounts
```

Display as a table: BA ID, description, status, available balance, currency. Show totals.

### Section 3: Transactions Component for Reports AH

Embed the Adyen `TransactionsOverview` component scoped to the Reports AH:

```javascript
const getSessionToken = async () => {
  const res = await trackedFetch('/api/adyen/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accountHolderId: 'AH32CNB22322885LGZLFL8XL6',
      roles: ['Transactions Overview Component: View']
    })
  });
  return res;
};
```

This gives the Reports tab its own live transaction view scoped to the platform-level AH.

### Section 4: Export to CSV

A button that copies the balance account table data to clipboard as CSV.

---

## API HISTORY TAB

**Route**: `/app/(dashboard)/api-history/page.js`

### Design

A clean table — NOT a complex expandable accordion. Think of it like a simple log viewer.

### Table Columns

| Method | Endpoint | Detail | Status | Time |
|---|---|---|---|---|
| `POST` | `/bcl/v2/paymentInstruments` | Created PI: PI3ABC...1234 | `201 OK` | 14:32:05 |
| `GET` | `/bcl/v2/accountHolders/AH32...` | AH Status: Active | `200 OK` | 14:31:58 |
| `POST` | `/v71/payments` | resultCode: Authorised, PSP: 8835... | `200 OK` | 14:30:12 |
| `POST` | `/lem/v3/legalEntities` | Created LE: LE32ABC... | `201 OK` | 14:29:00 |
| `GET` | `/btl/v4/grants` | 0 grants found | `200 OK` | 14:28:50 |
| `POST` | `/bcl/v2/balanceAccounts` | FAILED: insufficient permissions | `403 FAIL` | 14:28:30 |

### Method Badges

Each method gets a **small colored pill/badge**:
- `GET` → **green** pill
- `POST` → **blue** pill
- `PATCH` → **orange** pill
- `DELETE` → **red** pill

These should be compact, rounded, with white text on the colored background. Think the style of badges you see in Swagger/API docs.

### Detail Column

This is the key column that makes the log useful at a glance. The `ApiHistoryContext` should extract a smart "detail" summary from each response:

- For account holder calls: show status or ID created
- For payment instrument calls: show PI ID or last 4
- For payment calls: show resultCode + pspReference
- For legal entity calls: show LE ID created
- For grant calls: show count or grant ID
- For errors: show the Adyen error message
- Generic fallback: show first meaningful field from response

### Status Column

- `200 OK` or `201 OK` → **green** text
- `4xx FAIL` → **red** text
- `5xx FAIL` → **red** text

### Clickable Rows

Clicking a row opens a modal/drawer showing the full request body and response body as formatted JSON with a monospace font. Include "Copy" buttons for each.

### Filters (top bar, simple)

- Method filter: pill toggles for GET / POST / PATCH / DELETE (multi-select, all on by default)
- Status filter: toggle for Success / Failed
- Clear History button

---

## Session Token API Route (shared)

`/app/api/adyen/sessions/route.js`

This is the critical shared route used by Transactions, Payouts, Capital, and Reports tabs.

```javascript
import { adyenSessionRequest } from '@/lib/adyen';

export async function POST(request) {
  try {
    const { accountHolderId, legalEntityId, roles, product } = await request.json();
    
    const body = {
      allowOrigin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      product: product || 'platform',
      policy: {
        resources: [],
        roles: roles || []
      }
    };

    // For platform components, use accountHolderId
    if (accountHolderId) {
      body.policy.resources.push({
        accountHolderId,
        type: 'accountHolder'
      });
    }
    
    // For onboarding components, use legalEntityId
    if (legalEntityId) {
      body.policy.resources.push({
        legalEntityId,
        type: 'legalEntity'
      });
    }

    const data = await adyenSessionRequest('/sessions', 'POST', body);
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: error.message || 'Session creation failed', details: error },
      { status: error.status || 500 }
    );
  }
}
```

---

## Reusable Adyen Component Wrapper

Create a React component `AdyenComponentMount` that handles the common pattern of:
1. Fetching a session token
2. Initializing `AdyenPlatformExperience`
3. Creating and mounting the specific component
4. Showing a loading skeleton while initializing
5. Showing an error state if it fails
6. Cleanup on unmount

```javascript
// components/AdyenComponentMount.js
'use client';
import { useEffect, useRef, useState } from 'react';

export default function AdyenComponentMount({ 
  componentName,  // 'TransactionsOverview' | 'PayoutsOverview' | 'CapitalOverview'
  accountHolderId,
  roles,
  onError 
}) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    let componentInstance = null;

    const init = async () => {
      try {
        const { AdyenPlatformExperience, TransactionsOverview, PayoutsOverview, CapitalOverview } = 
          await import('@adyen/adyen-platform-experience-web');
        await import('@adyen/adyen-platform-experience-web/adyen-platform-experience-web.css');

        const componentMap = { TransactionsOverview, PayoutsOverview, CapitalOverview };
        const ComponentClass = componentMap[componentName];
        if (!ComponentClass) throw new Error(`Unknown component: ${componentName}`);

        const getSession = async () => {
          const res = await fetch('/api/adyen/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountHolderId, roles })
          });
          if (!res.ok) throw new Error('Session creation failed');
          return res.json();
        };

        const core = await AdyenPlatformExperience({ session: getSession });
        componentInstance = new ComponentClass({ core });
        
        if (mounted && containerRef.current) {
          componentInstance.mount(containerRef.current);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message);
          setLoading(false);
          onError?.(err);
        }
      }
    };

    init();
    return () => { 
      mounted = false; 
      componentInstance?.unmount?.();
    };
  }, [accountHolderId, componentName, roles]);

  if (error) return <div className="error-state">Component failed to load: {error}</div>;
  
  return (
    <div>
      {loading && <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />}
      <div ref={containerRef} style={{ display: loading ? 'none' : 'block' }} />
    </div>
  );
}
```

---

## File Structure

```
card-portal/
├── app/
│   ├── layout.js
│   ├── page.js                      # Login/Register
│   ├── globals.css
│   ├── (dashboard)/
│   │   ├── layout.js               # Sidebar + auth gate
│   │   ├── home/page.js            # Bank splash + Transactions component
│   │   ├── registration/page.js    # Capabilities + Hosted Onboarding + BL form
│   │   ├── cards/page.js           # Visual wallet
│   │   ├── checkout/page.js        # Payment terminal
│   │   ├── capital/page.js         # Capital component (Reports AH)
│   │   ├── payouts/page.js         # Payouts component + Sweep config
│   │   ├── reports/page.js         # Reports AH data + Transactions component
│   │   └── api-history/page.js     # API log table
│   └── api/
│       ├── register/route.js
│       ├── login/route.js
│       └── adyen/
│           ├── sessions/route.js        # Shared session token creation
│           ├── account-overview/route.js
│           ├── hosted-onboarding/route.js
│           ├── legal-entity/
│           │   ├── route.js
│           │   └── business-lines/route.js
│           ├── cards/
│           │   ├── route.js
│           │   └── [id]/route.js
│           ├── checkout/
│           │   └── sessions/route.js    # POST — create Checkout session for Drop-in
│           ├── capital/
│           │   └── grants/route.js
│           ├── transfers/
│           │   └── route.js
│           ├── sweeps/
│           │   └── route.js             # GET list, POST create sweeps
│           └── reports/
│               ├── account-holder/route.js
│               └── balance-accounts/route.js
├── components/
│   ├── Sidebar.js
│   ├── LoginForm.js
│   ├── CardVisual.js               # Realistic credit card rendering
│   ├── AdyenComponentMount.js      # Reusable Platform Experience wrapper
│   ├── StatusBadge.js
│   ├── MethodBadge.js              # GET/POST/PATCH/DELETE colored pills
│   ├── CopyButton.js
│   ├── Toast.js
│   ├── ConfirmDialog.js
│   ├── EmptyState.js
│   └── LoadingSkeleton.js
├── context/
│   ├── AuthContext.js
│   └── ApiHistoryContext.js         # Logs calls with smart detail extraction
├── lib/
│   ├── adyen.js                     # All 5 Adyen API helpers
│   ├── constants.js                 # Timezones, nav items, etc.
│   └── utils.js                     # formatCurrency, formatDate, generateRef, extractDetail
├── tailwind.config.js
├── postcss.config.js
├── next.config.js
├── package.json
├── .env.local
├── .env.example
└── .gitignore
```

---

## `extractDetail` Utility

In `/lib/utils.js`, create a function that extracts a human-readable detail string from an API response:

```javascript
export function extractDetail(endpoint, response) {
  if (!response) return '—';
  
  // Error responses
  if (response.error || response.errorCode) {
    return `FAILED: ${response.message || response.error || 'Unknown error'}`;
  }
  
  // Account holders
  if (endpoint.includes('accountHolders')) {
    if (response.id) return `AH: ${response.id}, Status: ${response.status || 'created'}`;
    return `AH lookup`;
  }
  
  // Payment instruments
  if (endpoint.includes('paymentInstruments')) {
    if (response.id) return `PI: ${response.id}, Last4: ${response.card?.lastFour || '—'}`;
    if (response.paymentInstruments) return `${response.paymentInstruments.length} card(s) found`;
    return 'Card operation';
  }
  
  // Payments
  if (endpoint.includes('/payments')) {
    return `${response.resultCode || '—'}, PSP: ${response.pspReference || '—'}`;
  }
  
  // Legal entities
  if (endpoint.includes('legalEntities')) {
    if (response.id) return `LE: ${response.id}`;
    return 'LE operation';
  }
  
  // Grants
  if (endpoint.includes('grants')) {
    if (Array.isArray(response.data)) return `${response.data.length} grant(s)`;
    if (response.id) return `Grant: ${response.id}`;
    return 'Grant operation';
  }
  
  // Sessions
  if (endpoint.includes('sessions')) {
    return `Session created: ${response.id?.slice(0, 12)}...`;
  }
  
  // Sweeps
  if (endpoint.includes('sweeps')) {
    if (response.id) return `Sweep: ${response.id}, Type: ${response.type}`;
    return 'Sweep operation';
  }
  
  // Balance accounts
  if (endpoint.includes('balanceAccounts')) {
    if (response.id) return `BA: ${response.id}`;
    if (response.balanceAccounts) return `${response.balanceAccounts.length} BA(s)`;
    return 'BA operation';
  }
  
  // Business lines
  if (endpoint.includes('businessLines')) {
    if (response.id) return `BL: ${response.id}`;
    return 'Business line operation';
  }
  
  return JSON.stringify(response).slice(0, 60) + '...';
}
```

---

## UI Polish Checklist

1. **Loading skeletons**: `animate-pulse` everywhere
2. **Error states**: Show Adyen error message + "Retry"
3. **Empty states**: Icon + message for every list
4. **Toast notifications**: Bottom-right, green success / red error
5. **Confirmation dialogs**: Before close card, delete sweep
6. **Currency**: All amounts formatted via `Intl.NumberFormat`, Adyen returns minor units (÷100)
7. **Copy clipboard**: Small icon next to every ID
8. **Card Visual**: Gradient backgrounds, chip, brand styling, eye icon reveal animation
9. **Method badges**: Compact colored pills in API History
10. **No TypeScript**: `.js` everywhere

---

## Summary — Everything That Should Work

1. ✅ Login & Registration with real Adyen API calls (LE + AH + BA)
2. ✅ Home: Commercial bank splash, live balance, **embedded Adyen Transactions Overview component**
3. ✅ Registration: Capabilities table from AH call, **Hosted Onboarding button**, business line creation
4. ✅ Cards: **Visual wallet** with realistic card renders, Visa (`visa_credit_s`) and MC (`mc_credit_mco`), **eye icon reveal** for PAN/expiry/CVC
5. ✅ Checkout: **Adyen Drop-in component** with Sessions flow, random order amounts, 3DS support built-in
6. ✅ Capital: **Adyen Capital component** (on Reports AH, may not load), API fallback for grants
7. ✅ Payouts: **Adyen Payouts Overview component**, **sweep configuration** with transfer instrument
8. ✅ Reports: **Reports AH user** from env, balance accounts, **embedded Transactions component**
9. ✅ API History: Clean table with **colored method badges**, **smart detail column**, **status OK/FAIL**
10. ✅ Session token management for all Platform Experience components
11. ✅ Adyen brand colors throughout, polished loading/error/empty states

Build this project now. Start with `npx create-next-app@latest card-portal` with App Router, JavaScript, Tailwind, then `npm install @adyen/adyen-platform-experience-web @adyen/adyen-web`, and implement everything described above.