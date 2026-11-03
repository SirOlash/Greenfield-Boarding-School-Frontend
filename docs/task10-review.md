# Task 10 — frontend API integration review

Changes are uncommitted on `fix/backend-api-alignment` in
`SirOlash/Greenfield-Boarding-School-Frontend`, from frontend commit
`5b0401ab007d28f770adc1bd1792531dc7126fb3`. The frontend working tree was clean
before this feature branch was created.

Contracts were compared with backend commit
`bb90ac6b59734b54a089bde816138c5a6d8efa6a` on `fix/secure-demo-config`,
including controller mappings, request/response DTOs, registration authorization,
accounting, fee calculation, collection processing, scheduling and reconciliation.
Two pre-existing backend edits remove unused imports; they were left untouched.
No backend files were changed by Task 10.

No commit, push, merge, deployment, provider operation or external service change
was performed. No dependency or lockfile was changed.

## API compatibility changes

- Existing-parent signup requires their authenticated parent session and fixed
  account email. It omits password/bank replacement inputs. New-parent signup
  remains available; 409 conflicts offer safe sign-in/check-details guidance.
- Requests use `numberOfInstallments` and explicit recurring frequency; school-fee
  amount is omitted. Preview fees match documented backend defaults but are
  labeled estimates; returned invoice amounts and exact installment terms prevail.
- Amounts show two decimals. Unknown balances remain unknown, unlimited
  subscriptions have no finite remaining balance, and confirmed collections come
  from ledger terms. Planned down payments and status flags are not revenue.
- Stored counters alone never prove installment completion. The display checks
  aggregate confirmed/remaining money and the exact schedule, permits out-of-order
  installments and an uncollected down payment, and shows count progress only
  when one count is possible and the stored counter agrees. Ambiguous or
  inconsistent counts remain unavailable; no collection records are fabricated.
- Backend expiry text is strictly parsed as `yyyy-MM-dd HH:mm:ss` in Africa/Lagos,
  rather than the browser timezone. Invalid calendar values are unavailable.
  Expired instructions never imply a cancelled recurring plan.
- Parent dashboards expose parent actions. Branch/super administrators retain
  allowed reads and query controls where detailed provider identifiers exist;
  administrative views do not expose parent plan changes or invoice/cancellation
  controls. Super-admin collection totals use server ledger revenue unchanged.
- Branch-list `type` is normalized explicitly. Numeric row IDs never become
  provider IDs. Branch administrators obtain queryable records through authorized
  student details. Super-admin payment totals use existing branch-scoped reads.
  Unsupported unfiltered payment and branch-delete calls were removed.
- Queries display read-only diagnostics without refreshing/mutating financial
  state or claiming confirmation. Supported repeated cancellation succeeds;
  conflicts leave the UI unchanged and provide refresh guidance.
- Offline notices replace transfer/QR prompts and payment-success claims. The
  registration receipt performs no unauthenticated query polling, and no public
  simulation control or API call is present.
- Existing JWT interception remains. A 401 clears stored/rendered identity,
  preserves sign-in feedback, and safely returns an existing parent to
  registration. Expected HTTP statuses have consistent guidance; unexpected
  failures never display raw server/transport exception messages.
- Late child/student payment reads cannot replace a newly selected child's
  records or provider ID. UI components, Tailwind styling and existing design
  primitives remain; the app was not replaced or moved to another framework.

## Validation results

| Command/check | Result |
| --- | --- |
| Baseline `npm run test` | 1 existing test passed |
| Baseline `npm run lint` | 19 errors, 12 warnings |
| Final `npm run build` | Passed |
| Final `node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit` | Passed |
| Final `npm run test` | **132 passed**, 0 failures/skips, 14 test files |
| Final `npm run lint` | Exit 1: **3 pre-existing errors, 8 pre-existing warnings** |
| ESLint on all changed TS/TSX files | Exit 0: 0 errors; existing AuthContext fast-refresh warning |
| `git diff --check` | Passed |

The 131 additional tests exercise money formatting/precision, exact schedules,
unknown/unlimited balances, ledger-versus-counter conflicts and ambiguous
progress, Lagos expiry parsing/boundaries, registration validation and actual
request payloads, branch failure/retry, safe login redirects, roles, read-only
queries, idempotent cancellation/conflicts, no public polling, offline notices,
JWT session handling and delayed-response isolation.

These are Vitest/React Testing Library tests using typed HTTP mocks. No
browser-to-running-backend end-to-end session, hosted backend, real provider or
deployed environment was verified. Early validation found an ES2020
`replaceAll` mismatch; it was fixed. Later source corrections were followed by
fresh passing tests, type checking and production build.

Build warnings remain for old Browserslist data and a JavaScript chunk above
500 kB. Tests report dependency-level Node punycode deprecation and React Router
future-flag warnings. No library updates or warning suppression were introduced.

### Pre-existing lint errors, kept separate

These three files are unchanged by Task 10:

| File | Existing error |
| --- | --- |
| `src/components/ui/command.tsx:24` | `@typescript-eslint/no-empty-object-type` |
| `src/components/ui/textarea.tsx:5` | `@typescript-eslint/no-empty-object-type` |
| `tailwind.config.ts:117` | `@typescript-eslint/no-require-imports` |

The eight remaining fast-refresh warnings are in existing UI primitives and
AuthContext. Four dashboard dependency warnings and sixteen errors in changed
integration files were resolved. ESLint rules were not disabled and unrelated
generated components/configuration were not rewritten to make the command green.

## Remaining frontend/backend gaps

1. No parent-profile read endpoint returns saved phone/surname/banking details.
   Existing parents re-enter the DTO-required missing values; the exact saved
   phone must match. Registration omits bank replacements. A parent without saved
   banking data must choose single payment or explicitly configure their own
   plan through the supported authenticated flow.
2. Parent student responses omit saved plan/frequency/count. The parent first
   explicitly saves the intended plan before generating a school-fee invoice;
   existing pending/active school-fee conflicts remain enforced by the backend.
3. No fee-discovery route exists. Default synthetic previews can differ from an
   overridden server schedule, so preview prices are never submitted and final
   returned terms are authoritative.
4. Lists provide aggregate confirmed money and stored counters, not individual
   confirmed collection slots. Exact installment-count progress is unavailable
   when multiple slot/count combinations explain the same amount. A future
   additive server-derived count/slot contract could remove this uncertainty.
5. Branch-list rows omit provider identifiers and expiry metadata. Authorized
   student-detail responses supply the available queryable detail; no identifier
   is guessed from the numeric row ID.
6. Full numeric(38,2) values exceed JavaScript JSON-number precision. The frontend
   supports up to NGN 9,999,999,999,999.99 and shows unsupported amounts as unknown;
   ad-hoc inputs also require an exact JSON-number round trip. Supporting the
   database's full range needs a coordinated decimal-string contract.
7. Offline UI assumes a backend configured for mock mode; there is no provider-mode
   discovery endpoint in this contract. No historical real-adapter functionality
   is claimed. Real verification/reconciliation and environment security remain
   separate backend work.

## Manual review

See [README](../README.md) for local configuration, the endpoint table and money
rules. Start the backend separately in `dev`/`mock` with private JWT configuration
and any explicitly enabled private demo seeding required to supply branches.
Then run `npm run dev -- --host 127.0.0.1` with `VITE_API_BASE_URL=/api`.

Review new-parent registration and login, then use the parent's **Register Another
Child** link. Check fixed email, saved-phone validation, no password/banking
replacement shortcut and useful 409 feedback. Compare default previews with
returned invoice terms, especially the final installment. A fresh invoice remains
pending with zero confirmed collections; do not send any transfer.

For parent payment views, inspect exact schedules, unknown/unlimited balances,
expiry distinct from status, ad-hoc two-decimal requests, and read-only query
diagnostics. Existing active/pending school-fee plans correctly cause 409 when
changing plans or requesting another school-fee invoice. Check branch-admin
student details/query and super-admin ledger totals; parent actions are absent.
Tests contain synthetic fixtures for confirmed, cancelled and legacy cases; the
frontend exposes no simulation mechanism to manufacture those states.

## Every changed file

The changed-files review ZIP contains **41 files**: 20 modified files and 21 new
files, preserving project-relative paths. No files are deleted.

| File | Purpose |
| --- | --- |
| `README.md` (new) | Local setup, API contracts, manual review and limitations |
| `docs/task10-review.md` (new) | This complete manifest and validation report |
| `src/types/payment-api.ts` | Typed requests, distinct invoice/list DTOs, nullable legacy fields and diagnostics |
| `src/lib/feeConfig.ts` | Synthetic preview fees, exact kobo arithmetic, two-decimal NGN and demo bank option |
| `src/lib/feeConfig.test.ts` (new) | Money and exact schedule regressions |
| `src/lib/paymentPresentation.ts` (new) | Ledger balance/progress/role helpers and branch normalization |
| `src/lib/paymentPresentation.test.ts` (new) | Unknown/unlimited balances, roles and counter/ledger edge cases |
| `src/lib/paymentDates.ts` (new) | Strict backend Lagos expiry parsing and formatting |
| `src/lib/paymentDates.test.ts` (new) | Timezone, boundary, calendar and invalid-format regressions |
| `src/lib/apiErrors.ts` (new) | Safe consistent HTTP error guidance |
| `src/lib/apiErrors.test.ts` (new) | Expected status handling and unexpected-error redaction |
| `src/lib/axiosConfig.ts` | Preserved JWT interceptor, local proxy default and session expiry handling |
| `src/lib/axiosConfig.test.ts` (new) | Bearer attachment/removal and 401 behavior |
| `src/lib/registration.ts` (new) | Typed validated registration request construction |
| `src/lib/registration.test.ts` (new) | Registration validation, omissions and canonical recurring fields |
| `src/contexts/AuthContext.tsx` | Validated cached identity and rendered-state clearing on 401 |
| `src/contexts/AuthContext.test.tsx` (new) | Cached-session and login/logout/expiry regressions |
| `src/components/OfflineDemoNotice.tsx` (new) | Shared explicit synthetic-payment notice |
| `src/components/OfflineDemoNotice.test.tsx` (new) | Mock notice and absence of confirmation controls |
| `src/components/Navbar.tsx` | Visible offline-demo label |
| `src/components/DashboardLayout.tsx` | Offline notice in existing dashboard layout |
| `src/pages/Index.tsx` | Offline notice and accurate payment/notification descriptions |
| `src/pages/Login.tsx` | Safe error feedback and allowlisted registration return |
| `src/components/registration/RegistrationWizard.tsx` | Authenticated existing-parent flow and canonical submission |
| `src/components/registration/steps/StudentDetailsStep.tsx` | Actual branch selection, failure blocking/retry and fee previews |
| `src/components/registration/steps/ParentDetailsStep.tsx` | Distinct existing/new parent fields and validation |
| `src/components/registration/steps/PaymentChoiceStep.tsx` | Explicit recurring configuration and exact synthetic previews |
| `src/components/registration/RegistrationSteps.test.tsx` (new) | Parent fields, recurring previews and branch retry |
| `src/components/registration/RegistrationWizard.test.tsx` (new) | HTTP registration/auth/conflict and login redirect integration |
| `src/components/PaymentSuccessCard.tsx` | Registration receipt without transfer/confirmation/polling claims |
| `src/components/dashboards/PaymentTermsSummary.tsx` (new) | Shared authoritative invoice schedule/terms rendering |
| `src/components/dashboards/PaymentDetailsModal.tsx` | Ledger balances, safe lifecycle labels, query diagnostics and cancellation |
| `src/components/dashboards/InvoiceSuccessModal.tsx` | Invoice-created presentation using returned terms |
| `src/components/dashboards/CreatePaymentModal.tsx` | Parent ad-hoc invoices with precise amounts and recurring fields |
| `src/components/dashboards/SwitchPlanModal.tsx` | Parent-only plan changes with explicit optional bank replacement |
| `src/components/dashboards/paymentComponents.test.tsx` (new) | Terms, offline notices, lifecycle/query/cancellation regressions |
| `src/components/dashboards/paymentForms.test.tsx` (new) | Request payloads, roles, frequencies and monetary validation |
| `src/pages/dashboards/ParentDashboard.tsx` | Ledger-based parent views, actions and guarded child selection |
| `src/pages/dashboards/BranchAdminDashboard.tsx` | Scoped read/query views and normalized branch data |
| `src/pages/dashboards/SuperAdminDashboard.tsx` | Actual scoped routes and unchanged server ledger totals |
| `src/pages/dashboards/Dashboards.test.tsx` (new) | Dashboard paths, roles, balances, payloads and response races |

The ZIP excludes Git metadata, node_modules, dist, test/build logs, environment
files, credentials and unrelated files. Independent review is required before
any commit or push.
