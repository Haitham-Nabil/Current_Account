# Phase 4B.26.5 — Manual Acceptance Checklist

Please test on a copy of your current application data.

## A. Sidebar and movement entry
- [ ] `المدفوعات` no longer appears in the sidebar.
- [ ] `التسويات` no longer appears in the sidebar.
- [ ] `تسجيل حركة` remains visible and opens the movement registration workflow.
- [ ] Cash Received, Cash Paid, Settlement, and Goods Exchange can still be recorded from the movement form.
- [ ] Existing direct legacy URLs, if opened manually, do not cause an application error.

## B. Arabic alphabetical customer selectors
- [ ] Carton purchase report customer selector is alphabetically ordered.
- [ ] Local crop purchase report customer selector is alphabetically ordered.
- [ ] General movement report customer selector is alphabetically ordered.
- [ ] Customer/account report customer selector is alphabetically ordered.
- [ ] Selecting a customer and applying filters still returns that customer's report.
- [ ] Inactive customer labels remain distinguishable and selecting `كل العملاء` still works.
- [ ] The customer list screen itself has not been reordered or changed by this phase.

## C. Reports interface
- [ ] Switch among all report families and report types.
- [ ] Apply, reset, and combine filters.
- [ ] Check summary/detail modes and drill-down navigation.
- [ ] Verify KPI cards and table columns remain readable on desktop and a narrow window.
- [ ] CSV export still produces the expected columns and values.

## D. Customer statement PDF
- [ ] Open an individual customer statement and verify the selected customer and period.
- [ ] Choose `معاينة / حفظ PDF` and confirm the browser print preview opens.
- [ ] Confirm company name, customer name/code, period, prior balance, debit, credit, and closing balance are present.
- [ ] Confirm the transaction table includes dates, movement type, description/details, debit/credit, and running balance.
- [ ] Confirm the statement is landscape A4, Arabic RTL is correct, table headings repeat on subsequent pages, and no important columns are clipped.
- [ ] Save as PDF and open the resulting file to inspect all pages.

## Result
- [ ] All tests passed.
- [ ] Issues found (describe):

