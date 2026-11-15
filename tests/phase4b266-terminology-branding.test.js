import test from 'node:test';
import assert from 'node:assert/strict';
import { TRANSACTION_TYPE_LABELS_AR } from '../src/domain/transactionTypes.js';
import { customerFormHtml } from '../ui/views/customerForm.js';
import { customerReportViewHtml } from '../ui/views/reportCustomers.js';
import { cropPurchasesViewHtml } from '../ui/views/cropPurchases.js';
import { cropReportViewHtml } from '../ui/views/reportCropLocal.js';
import { dashboardViewHtml } from '../ui/views/dashboard.js';

test('Phase 4B.26.6: customer-facing labels consistently use المورد terminology', () => {
  const rendered = [
    customerFormHtml(),
    customerReportViewHtml(),
    dashboardViewHtml()
  ].join('\n');
  assert.match(rendered, /المورد/);
  assert.doesNotMatch(rendered, /العملاء|العميل|عميل/);
});

test('Phase 4B.26.6: local crop purchase wording is consistently مشتريات محلي', () => {
  assert.equal(TRANSACTION_TYPE_LABELS_AR.CropPurchaseLocal, 'مشتريات محلي');
  for (const rendered of [cropPurchasesViewHtml(), cropReportViewHtml()]) {
    assert.match(rendered, /مشتريات محلي/);
    assert.doesNotMatch(rendered, /مشتريات محصول محلي|مشتريات المحصول المحلي/);
  }
});
