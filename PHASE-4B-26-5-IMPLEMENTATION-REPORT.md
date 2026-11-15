# Phase 4B.26.5 — Reports & Customer Statement PDF UX

## Implemented scope

### 1. Sidebar navigation
- Removed the `المدفوعات` and `التسويات` entries from the visible sidebar navigation.
- Kept both route definitions, screen modules, service integrations, and direct route resolution intact. This is a navigation-only change; no data or business behavior was removed.
- The existing `تسجيل حركة` quick action remains the primary entry point for recording all movement types.

### 2. Report customer selector ordering
- Added a shared Arabic-aware comparator using `Intl.Collator('ar', { sensitivity: 'base', numeric: true, ignorePunctuation: true })`.
- Applied alphabetical ordering to customer selectors in:
  - Carton purchase reports.
  - Local crop purchase reports.
  - General movement reports.
  - Customer and account reports.
- Sorting is applied to a copied array and does not mutate service results, stored records, report group order, or customer-list screens.
- Existing selected values, active/inactive labels, and filter behavior are retained.

### 3. Reports interface refinement
- Improved report workspaces with consistent tab containers, more legible active/inactive controls, more structured filter panels, clearer export action placement, KPI spacing, and table presentation.
- Added responsive behavior for narrow screens.
- Kept all report families, report modes, filters, calculations, service contracts, CSV content rules, and drill-down behavior unchanged.

### 4. Customer statement PDF/print experience
- Updated the action label to `معاينة / حفظ PDF` to make the browser print-preview step explicit.
- Added a dedicated A4 landscape page definition for customer statements, better spacing for the statement header and status, more consistent KPI cards, and improved table readability.
- Preserved the company identity, report metadata, customer identity, period, prior balance, debit/credit totals, closing balance, and transaction details already supplied by the statement view.
- The browser print dialog remains the delivery mechanism; users can select Microsoft Print to PDF / Save as PDF. This is not a direct PDF-generation engine.

## Data and accounting safety
- No database schema changes.
- `DB_VERSION` unchanged.
- No changes to balances, financial formulas, transaction classifications, permissions, or stored data.
- No permanent deletion of routes or screen implementations.

## Verification
- JavaScript syntax check: all JavaScript files under `src`, `ui`, and `tests` passed `node --check`.
- Focused tests: 17/17 passed (`uiShell.test.js` and `reportCustomerSort.test.js`).
- Full suite: 177 tests discovered; 145 passed. 32 test files/cases could not load because `fake-indexeddb` is not installed in this execution environment (`ERR_MODULE_NOT_FOUND`). These are environment/dependency failures, not assertion failures.
- Browser visual automation: not run in this environment. Manual visual acceptance is required for final approval.

## Manual acceptance required
See `PHASE-4B-26-5-MANUAL-ACCEPTANCE.md`.
