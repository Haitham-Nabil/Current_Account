# Phase 4B.26.6 — Terminology & Sidebar Branding

**Status:** Implemented; awaiting user manual acceptance  
**Date:** 2026-11-14  
**Base:** Approved Phase 4B.26.5 package

## 1. Implemented changes

### 1.1 Customer terminology
- Replaced user-facing Arabic wording for `العميل / العملاء` with `المورد / الموردين` throughout the application UI.
- Updated the same terminology in form labels, page headings, account statements, movement descriptions, dashboard labels, report filters and tables, empty/error states, validation/service messages, backup/restore messages, and print/CSV-facing report labels.
- Updated the application document title and preview builders/artifacts to use the new wording.
- Kept internal identifiers, route paths, storage keys, IndexedDB store names, model properties, and service API names unchanged.

### 1.2 Local crop purchase wording
- Replaced the visible local-crop transaction label `مشتريات محصول محلي` with `مشتريات محلي`.
- Applied the wording to the transaction type catalogue, local crop purchase entry card, local crop reports, dashboard crop summary labels, and related visible messages.
- Kept the internal transaction type `CropPurchaseLocal` and all financial calculations unchanged.

### 1.3 Sidebar navigation
- Removed the `الاستيراد من Excel` entry from the visible sidebar.
- Kept the route definition and existing import implementation intact; this is a navigation-only removal, not deletion of import code or data.
- Existing Payments and Settlements sidebar exclusions remain unchanged.

### 1.4 Sidebar footer
Added a footer at the bottom of the sidebar containing:
- **برنامج الحساب الجاري**
- **إصدار البرنامج: 1.0.0** (matches `package.json`)
- **تصميم وبرمجة: هيثم نبيل**
- **01008805646**

The company name at the top of the sidebar remains controlled by the existing company-name setting. The application name footer is separate and fixed. Sidebar footer styles preserve the existing RTL and responsive layout; on short/tight viewports the sidebar can scroll rather than overlap navigation items.

## 2. Data and accounting safety
- No database schema changes.
- `DB_VERSION` remains unchanged.
- No data migration or rewriting of existing customer records.
- No changes to customer IDs, transaction IDs, financial formulas, balances, transaction classifications, permissions, or service behavior.
- Existing stored records continue to be associated by the same internal customer identifiers; only displayed terminology changes.

## 3. Verification

### Passed
- JavaScript syntax check across all `.js` and `.mjs` files under `src`, `ui`, `tests`, and `tools`.
- Focused UI/terminology/navigation/report/transaction-safety tests: **75/75 passed**.
- Full test suite: **148 passed** out of 180 discovered.
- Runtime/UI/preview scan found no remaining old Arabic customer terms or old local-crop wording in application-facing source and preview files.
- New automated tests cover the supplier terminology, local-crop label, sidebar footer details, and removal of Excel import from the sidebar while retaining direct route resolution.

### Not completed / environment limitation
- **32 test files could not load** because `fake-indexeddb` is absent from the execution environment (`ERR_MODULE_NOT_FOUND`). An offline dependency installation was attempted but the package was not available in the local npm cache. These 32 are dependency-load failures, not assertion failures.
- Browser screenshot automation did not complete because the headless Chromium process timed out. Visual review remains part of the user's manual acceptance.

## 4. Manual acceptance
Use `PHASE-4B-26-6-MANUAL-ACCEPTANCE.md` for the final visual and functional checks. This phase is not considered approved until the user confirms the manual tests.
