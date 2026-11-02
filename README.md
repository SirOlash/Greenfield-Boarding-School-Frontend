# Greenfield — School Payments Frontend

**React + TypeScript + Vite frontend for Greenfield**, an individual full-stack
school-fee payment integration project built during the OnePipe Emerging Talent
Accelerator. I developed the frontend and Java/Spring Boot backend, integrated
OnePipe APIs and deployed a working internship demonstration.

> **Not originally a mock-only app.** The original internship build connected to
> OnePipe using temporary credentials and exercised real API/transfer testing,
> payment callbacks and notification/reminder workflows. These were demonstrated
> integration flows—not evidence of production use by real schools.

> **Current version:** When the internship's provider environment and integration
> credentials were cancelled/revoked, I adapted Greenfield to an **offline
> portfolio demo**. The frontend now works with the backend's synthetic invoice
> adapter and simulated payment ledger. **No real money is transferred, no actual
> bank account is created, and payment notifications/reminders are not claimed
> as active delivery features today.** Never transfer money to demo account
> strings or enter real bank details.

## Project journey

| Original OnePipe integration (historical) | Current reproducible demo |
| --- | --- |
| Onboarding and school-fee flows backed by actual OnePipe API calls and transfer tests | School fees and invoices generated locally via the mock provider |
| Payment notifications/callbacks and reminder workflows demonstrated | Backend rejects unverified real webhooks; confirmed collections are simulated and protected by a database ledger |
| Deployed working internship prototype | Local full-stack demo; public deployment must be configured separately |

The React UI provides parent/student registration, branch selection, role-aware
dashboards, payment-plan selection, exact installment previews, invoices, account
expiry and payment history. It distinguishes **planned fees from confirmed
simulated collections** and avoids misleading success or transfer instructions.

**Backend:** [Greenfield Spring Boot API](https://github.com/SirOlash/OnepipePWAIntegrationProject)
— see its README for the project history, architecture, security model, API
endpoints and Flyway/PostgreSQL setup.

This frontend is aligned with the backend's
`fix/secure-demo-config` branch. Its integration updates live on
`fix/backend-api-alignment` until merged. It does not expose a public
payment-confirmation button or a live provider integration.

## Local development

Use the existing package lock and a supported local Node/npm installation:

```powershell
npm ci
$env:VITE_API_BASE_URL = '/api'
npm run dev -- --host 127.0.0.1
```

Vite serves the app on port 5173. Its existing `/api` proxy targets the local
backend at `http://localhost:8080`. Start that backend separately with its
explicit `dev` profile and privately supplied JWT configuration; follow the
backend's configuration guide for optional development-only seeding and private
demo login credentials. A new empty backend has no branch/account by default;
public registration requires an actual branch returned by `GET /api/branches`.
The frontend never invents a branch when loading fails.

An existing local `.env` is left untouched. A shell `VITE_API_BASE_URL` overrides
the corresponding dotenv value when Vite starts. For a separate backend host,
set its full API base URL including `/api`, and configure that backend's CORS
appropriately. All `VITE_*` values are public browser configuration: never put JWT
signing keys, provider credentials, database passwords or other secrets there.
The application still stores the logged-in bearer token using its existing
localStorage mechanism and adds it through the Axios request interceptor.

No OnePipe credentials or live bank service is needed to reproduce the
**current mock-mode** interface. Original real integration tests were performed
during the internship and cannot be replayed with revoked credentials.
Some existing fonts/hero images use external asset URLs; offline payment mode
does not mean every visual asset is bundled locally.

## Actual API contracts

All paths below are relative to the API base, normally `/api`.

| API | Frontend use |
| --- | --- |
| `POST /auth/login` | Existing JWT login; 401 clears stale session state |
| `GET /branches` | Actual public branch selection; nullable private fields tolerated |
| `POST /students/register` | New parent, or authenticated owning parent adding a child |
| `GET /students?parentEmail=...` | Owning parent's children; email is URL-encoded |
| `GET /students?branchId=...` | Assigned branch administrator's student list |
| `GET /payments?studentId=...` | Authorized detailed records, including provider payment IDs |
| `GET /payments?branchId=...` | Administrative branch list; uses `type` and numeric row `id` |
| `POST /payments/new` | Parent-visible invoice creation; school fee amount omitted, ad-hoc amount supplied |
| `PUT /payments/students/{studentId}/switch-plan` | Authenticated owning parent only |
| `POST /payments/{providerId}/query` | Read-only diagnostics for authorized roles |
| `POST /payments/{providerId}/cancel` | Parent-visible subscription cancellation; conflicts leave displayed state unchanged |
| `GET /super-admin/stats` | Server ledger-derived total and administrative counts |
| `POST /branches` | Super administrator branch creation |

The super administrator reads payments through existing branch-scoped requests.
There is no invented unfiltered payments endpoint, branch-deletion endpoint,
school-fee endpoint or parent-profile endpoint. A branch-list numeric row ID is
never used as a provider ID in a query/cancel URL. Branch admins access queryable
detail through an authorized student's payment list. Administrative reads and
queries remain available; the frontend hides parent financial actions.

## Registration and financial presentation

- Existing parents must sign in before adding a child. Login can return them to
  `/register` through a fixed allowlist; it cannot redirect to arbitrary URLs.
  Their JWT account email is fixed. Registration never sends their password or
  replacement banking details. A 409 offers sign-in/check-details guidance.
- The existing-parent DTO still requires first name, surname and exact saved
  phone, while login returns only first name/email. The interface asks for the
  required missing values; it does not invent a profile lookup or overwrite the
  saved profile. If saved banking data is missing, recurring registration can
  return 400; choose single payment or separately configure the parent's plan.
- Recurring requests explicitly supply `frequency` (`DAILY`, `WEEKLY` or
  `MONTHLY`). Installments use canonical `numberOfInstallments`, meaning
  recurring installments **after** the separate down payment, from 1 to 10000.
- Fee previews use the documented synthetic defaults: JSS1–SS3 are NGN
  100000.00 / 110000.00 / 120000.00 / 130000.00 / 140000.00 / 150000.00.
  They are estimates; deployments can override the server schedule. School-fee
  requests omit `amount`; the final invoice and exact schedule use returned
  backend amounts and `terms`.
- Preview arithmetic uses integer kobo and the backend's 20% half-up down payment
  and remainder allocation to earliest installments. NGN 100000.00 over three
  installments is 20000.00 down, then 26666.67, 26666.67 and 26666.66. Returned
  `terms.installmentAmounts` controls final displays, including the final row.
- Parent student responses omit the saved plan and frequency. To avoid guessing,
  a parent first explicitly saves their intended plan, then generates a
  server-priced school-fee invoice. The backend enforces existing-plan conflicts.
- Confirmed and remaining amounts come from ledger-backed `terms`, not a planned
  down payment, raw legacy counters, invoice status or provider metadata. An
  explicit null is unknown. Historical `UNKNOWN` balances stay unknown, even
  when the recorded status is successful. Installment progress is shown only
  when aggregate ledger money uniquely establishes the count and the counter agrees;
  ambiguous or inconsistent counts remain unavailable. The down payment is separate.
- Unlimited subscriptions show the full per-cycle charge, frequency and no finite
  remaining balance or automatic end date. Finite totals are labeled separately
  and show subscription counts rather than summing subscription nulls as debt.
  Cancelled subscriptions retain their confirmed history.
- Expired synthetic instructions are displayed separately from plan status;
  expiry alone never means an installment or subscription has ended. Missing or
  malformed expiry is unavailable. Backend billing dates are displayed in their
  documented Africa/Lagos interpretation.
- A query displays local/provider diagnostics without claiming it updated status
  or verified money. Repeated supported cancellation succeeds idempotently;
  409/state conflicts prompt refresh and do not optimistically mutate balances.
- Expected 400/401/403/404/409 errors have consistent guidance. Unexpected server
  failures use a generic safe message, without displaying raw exception text.

## Features demonstrated

- Parent registration (including authenticated registration of additional children).
- Separate parent, branch-admin and super-admin views governed by backend permissions.
- Server-authoritative fees, two-decimal NGN formatting and exact installment terms.
- Distinction between pending invoices, verified *simulated* collections, unknown balances and unlimited subscription cycles.
- Safe mock-account notices, expiry display and read-only reconciliation diagnostics.

## Verification

```powershell
npm run build
npm run lint
npm run test
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit
```

Vitest covers currency precision, unknown/unlimited balances, exact installment
progress, registration validation and HTTP payloads, role-specific controls,
query/cancellation behavior, conflict messages, JWT interception and offline
notices. API tests use typed mocks; they do not claim a live deployment or a
browser-to-backend end-to-end run. See [the Task 10 review](docs/task10-review.md)
for the file manifest, final command results and pre-existing lint findings.

## Remaining limits

The backend JSON API represents money as numbers, while PostgreSQL supports
numeric(38,2). This frontend conservatively supports at most 15 decimal digits in
kobo (NGN 9,999,999,999,999.99). Larger/invalid displays are unknown; ad-hoc inputs
outside that range or without an exact JSON-number round trip are rejected.
Supporting the full database range requires a coordinated decimal-string API
contract rather than silently rounding JavaScript numbers.

There is no server fee-discovery, parent-profile read or saved-plan read endpoint
in this backend contract. Those limitations are handled explicitly above rather
than adding backend routes. Branch-list rows also lack instruction-expiry and
provider identifiers; student-detail responses supply the available detail.

Use the backend in mock mode. No endpoint discovers provider mode for this UI.
Real provider verification, trusted bank reconciliation, automatic charges,
contact verification, rate limiting, restrictive deployment CORS and token
revocation remain backend/environment work. This task neither implements nor
publishes the backend's controlled development simulation in the frontend.
