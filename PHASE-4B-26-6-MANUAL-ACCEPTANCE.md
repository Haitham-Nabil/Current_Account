# Phase 4B.26.6 — Manual Acceptance Checklist

Run these checks using the delivered application package. Existing data should remain in place; do not clear IndexedDB for these tests.

## A. Supplier terminology

- [ ] Sidebar item displays **الموردين**.
- [ ] Supplier list, search, add form, edit form, validation errors, empty states, and inactive status messages use **مورد / موردين** consistently.
- [ ] Supplier selector in the movement form uses **المورد** and **اختر المورد** wording.
- [ ] The transaction log, customer/supplier account statement, opening-balance history, reports, drill-downs, and dashboard use supplier terminology.
- [ ] Debt transfer shows the two parties as المورد الدائن / المورد المدين, without changing either party's account or balance.
- [ ] Print preview and PDF output use supplier terminology.
- [ ] CSV column headings and labels use supplier terminology.
- [ ] Search and selection still work for existing records, including older records already saved before this update.

## B. Local crop purchase wording

- [ ] Crop purchases screen displays **مشتريات محلي** for the local crop option.
- [ ] New movement type selection displays **مشتريات محلي**.
- [ ] Existing local crop movements display **مشتريات محلي** in account statements and the central movement log.
- [ ] Local crop reports, dashboard summaries, print output, and CSV use **مشتريات محلي**.
- [ ] Carton purchase wording remains unchanged.
- [ ] Weight, package count, price/kg, net weight, and movement amount remain unchanged.

## C. Sidebar navigation

- [ ] **الاستيراد من Excel** no longer appears in the sidebar.
- [ ] The sidebar still displays the other approved navigation items correctly.
- [ ] The Excel import route/code was not deleted; only the sidebar entry was hidden.
- [ ] The تسجيل حركة quick action remains visible and works.
- [ ] Payments and Settlements remain absent from the sidebar as previously approved.

## D. Sidebar footer

- [ ] Footer appears at the bottom of the sidebar.
- [ ] It displays **برنامج الحساب الجاري**.
- [ ] It displays **إصدار البرنامج: 1.0.0**.
- [ ] It displays **تصميم وبرمجة: هيثم نبيل**.
- [ ] It displays **01008805646** exactly.
- [ ] The company name configured in Settings remains at the top of the sidebar and is not replaced by the footer branding.
- [ ] At desktop and smaller/mobile viewport sizes, the footer does not overlap navigation links, the logout button, or the quick action; the sidebar can scroll if needed.

## E. Data integrity and regression

- [ ] Existing suppliers and their account balances remain unchanged after updating the application.
- [ ] Adding a new supplier and recording a movement for that supplier work normally.
- [ ] Existing transaction review and confirmation flow remains unchanged.
- [ ] Existing reports, filters, customer/supplier drill-down, CSV export, and PDF/print preview continue to work.
- [ ] No unexpected changes to Settings, company name, package weight, user permissions, backup, or restore.

**Acceptance result:** All checks must pass before Phase 4B.26.6 is formally approved.
