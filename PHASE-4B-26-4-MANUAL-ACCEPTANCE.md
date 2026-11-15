# Phase 4B.26.4 — Manual Acceptance Checklist

Please test using a copy of your current application data / backup first. Do not use the only copy of live business data for acceptance testing.

## A. Form entry and visual design

- [ ] A1. Open `تسجيل حركة` from the sidebar; the redesigned form opens.
- [ ] A2. Open the form from a customer's account; the customer is preselected and remains locked.
- [ ] A3. Verify all ten transaction types appear as separate selectable tiles.
- [ ] A4. Select each tile and verify its selected state is clear and the correct dynamic fields appear.
- [ ] A5. Switch between several types; customer, date, and description are preserved according to the existing behavior, while fields specific to the previous type are not carried into the new type.
- [ ] A6. Verify the form sections, spacing, labels, action bar, and step indicator are visually clear at desktop width.
- [ ] A7. Repeat at a narrower window / mobile width; tiles and fields must not overlap or become difficult to use.

## B. Cash movements

- [ ] B1. Select `استلام نقدية`; verify the tile, safety panel, wording, and cash-in meaning are clear.
- [ ] B2. Select `دفع نقدية`; verify the tile, safety panel, wording, and cash-out meaning are clearly different from receipt.
- [ ] B3. Try to open review without checking the cash acknowledgement; the form must block the action and show an error.
- [ ] B4. Check the acknowledgement and open review; verify the modal identifies the correct cash direction and amount.
- [ ] B5. Return to editing; values remain unchanged and no movement is written.

## C. Review modal and final confirmation

- [ ] C1. For a normal sale, open review and verify type, customer, date, amount, and description.
- [ ] C2. Verify opening the review modal does not change the customer balance or add a movement.
- [ ] C3. Close using `رجوع للتعديل`; verify all values remain in the form.
- [ ] C4. Open review again and confirm; exactly one movement is written.
- [ ] C5. Try a rapid double click on the final confirmation; exactly one movement is written.
- [ ] C6. Verify a failed service validation returns to the form, preserves entered values, and writes nothing.
- [ ] C7. Verify Escape and clicking the modal backdrop return to editing when no save is in progress.

## D. Settlement, goods exchange, and debt transfer

- [ ] D1. For Settlement, verify the direction is mandatory and appears in the review details.
- [ ] D2. Repeat for GoodsExchange.
- [ ] D3. Verify the review shows current and projected balances supplied by the service when available.
- [ ] D4. Test a debit that would make the projected balance negative; the review shows a warning and asks for an explicit additional confirmation.
- [ ] D5. For DebtTransfer, verify both customers and both projected balances appear in review.
- [ ] D6. Test a transfer that would make the receiving balance negative; no leg is written before confirmation, and exactly two linked legs are written after confirmation.
- [ ] D7. Verify selecting the same customer on both sides is refused before review / write.

## E. Crop and carton purchases

- [ ] E1. Local crop purchase review shows variety (when selected), package count, loose kilos, kilo deduction, kilo price, configured package weight, net weight, and service-calculated total.
- [ ] E2. Verify the displayed local crop total matches the existing approved formula and the stored transaction result.
- [ ] E3. Carton purchase review shows receiving company, carton type, quantity, quantity discount, carton price, and service-calculated total.
- [ ] E4. Verify the carton total matches the existing approved formula and the stored transaction result.
- [ ] E5. Verify no manual Amount field or UI-calculated total is introduced for either crop purchase type.

## F. Roles and regression

- [ ] F1. Repeat a permitted movement entry while logged in as employee; review and final confirmation work.
- [ ] F2. Verify employee access to reports remains blocked.
- [ ] F3. Verify no employee edit / cancel permission is introduced.
- [ ] F4. Verify dashboard, customer account, reports, backup / restore, and settings continue to work as before.
- [ ] F5. Verify existing historical balances and movement records are unchanged.

## G. Acceptance

- [ ] All applicable cases passed.
- [ ] Any failed case and its exact steps / screenshot have been reported before accepting the phase.
