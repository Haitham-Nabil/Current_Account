# Phase 4B.26.3 — Transaction Entry UX & Financial Direction Safety

## Status
Implementation package prepared; awaiting the user's manual acceptance tests.

## Baseline
- Source baseline: approved `phase4b262-company-identity-professional-pdf.zip` (Phase 4B.26.2).
- `DB_VERSION` remains `5`.
- No IndexedDB stores, fields, migrations, or financial formulas were changed.
- Existing customer-specific transaction route `/transactions/add?customerId=...` is reused.

## Implemented

### 1. Sidebar movement action
- Added a distinct, high-visibility `تسجيل حركة` action at the top of the sidebar.
- It opens the existing general transaction-entry route, rather than introducing a duplicate form.
- The route continues to pass through the existing role filter; the employee receives no additional permission.
- Customer account entry continues to use the same form with the selected customer prefilled and locked.

### 2. Explicit direction for Settlement and GoodsExchange
- Added `Direction` to the dynamic form fields for both transaction types.
- The field starts with an unselected placeholder; there is no silent default to Credit.
- The choices preserve the existing stored meanings:
  - `Credit`: add to the customer's balance (دائن).
  - `Debit`: deduct from the customer's balance (مدين).
- Missing direction is reported by the form mapping and blocked by the UI before submission; the existing core validation remains authoritative.
- Added a service-backed preview showing transaction type, direction, amount, current balance, and projected balance.
- If the service projection shows an insufficient balance / negative projected balance, an explicit confirmation step is shown, consistent with the existing settlement workflow.

### 3. Strong distinction between CashReceived and CashPaid
- The transaction-type options now explain the opposite cash-flow effects:
  - CashReceived: funds enter the company / increase treasury cash.
  - CashPaid: funds leave the company / decrease treasury cash.
- The selected type displays a dedicated high-contrast panel with a different color, sign, heading, and plain-language cash impact.
- A mandatory acknowledgement checkbox must be selected before the UI calls the save service. This acknowledgement is UI-only and is not persisted as a financial field.
- Changing the transaction type resets the acknowledgement.
- The success result reiterates the cash effect for the selected type.

## Files changed
- `ui/components/layout.js`
- `ui/styles/layout.css`
- `ui/views/transactionForm.js`
- `src/validation/transactionFormInput.js`
- `tests/phase4b263-transaction-safety.test.js` (new)
- `tests/transactionFormEvents.test.js` (cash-acknowledgement regression case added)

## Financial and data safeguards
- No changes to transaction type identifiers.
- No changes to `Credit` / `Debit` stored values or their meanings.
- No changes to transaction creation services, balance formulas, cash columns, or report calculations.
- No new database field or persisted acknowledgement.
- Existing service/core validation and employee permission enforcement remain in place.

## Verification performed

### Passed
- JavaScript syntax check across all `.js` files under `src/`, `ui/`, `tests/`, and `tools/`.
- Focused Phase 4B.26.3 tests: **8/8 passed**. They cover explicit direction rendering, rejection of missing direction in the form mapping, preservation of Credit/Debit values, cash type descriptions and safety panels, the sidebar action, the cash acknowledgement save guard, service-projected directional preview, and insufficient-balance confirmation UI.
- Full test command result: **139 passed**.

### Environment limitations (not assertion failures)
- The full suite reports **32 test files unable to load** because `fake-indexeddb` is not installed in this execution environment (`ERR_MODULE_NOT_FOUND`). The dependency installation attempt (`npm ci --ignore-scripts --no-audit --no-fund`) timed out. The 32 cases are module-load failures, not failed assertions.
- Chromium headless visual capture was attempted but timed out before producing a screenshot. Therefore no successful automated visual/browser test is claimed.

## Manual acceptance required
The user should test the 25 acceptance cases in the Phase 4B.26.3 scope report, with special attention to:
1. Open `تسجيل حركة` from the sidebar and verify the general form opens.
2. Open the form from a customer's account and verify that customer is preselected and cannot be changed.
3. Select Settlement and GoodsExchange in both entry paths; verify the direction selector appears and starts unselected.
4. Try saving either type without a direction; saving must be blocked.
5. Select Credit and Debit separately; verify the preview shows the selected direction and service-projected balance.
6. Test a debit that would make the balance negative; verify the explicit confirmation step appears and saving occurs only after confirmation.
7. Select CashReceived and CashPaid in turn; verify their panels, wording, sign, and colors are unmistakably different.
8. Attempt to save either cash type without checking the acknowledgement; no service write must occur.
9. Check the acknowledgement and save; verify the resulting movement type and cash columns in the ledger and customer statement.
10. Repeat with the employee account and confirm the existing permissions remain unchanged.

The phase is not considered accepted until these manual checks are completed by the user.
