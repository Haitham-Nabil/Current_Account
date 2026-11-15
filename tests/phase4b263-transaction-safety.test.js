import test from 'node:test';
import assert from 'node:assert/strict';
import { TRANSACTION_TYPE } from '../src/domain/transactionTypes.js';
import { buildTransactionForm, FORM_KEY } from '../src/validation/transactionFormInput.js';
import { transactionAddPath } from '../ui/routes.js';
import { navigation } from '../ui/components/layout.js';
import { renderDynamicFields, renderDirectionalPreview, renderTransactionReviewModal, renderTransactionTypePicker, renderTransactionForm, transactionTypeOptions, initTransactionFormView, FIELD_ID, TRANSACTION_FORM_REGION_ID } from '../ui/views/transactionForm.js';
import { transactionFormService } from '../src/services/transactionFormService.js';

const base = {
  CustomerId: 'customer-1',
  Date: '2026-11-11',
  Amount: '125.50',
  Description: 'اختبار اتجاه الحركة'
};

test('Phase 4B.26.3: Settlement and GoodsExchange render an explicit direction selector', async () => {
  const { transactionFormService } = await import('../src/services/transactionFormService.js');
  for (const type of [TRANSACTION_TYPE.SETTLEMENT, TRANSACTION_TYPE.GOODS_EXCHANGE]) {
    const html = renderDynamicFields({ transactionType: type, values: { ...base, TransactionType: type, Direction: '' } });
    assert.match(html, /field-Direction/);
    assert.match(html, /اختر اتجاه الحركة/);
    assert.match(html, /إضافة إلى رصيد المورد/);
    assert.match(html, /خصم من رصيد المورد/);
    assert.ok(transactionFormService.formFields(type).includes(FORM_KEY.DIRECTION));
  }
});

test('Phase 4B.26.3: missing explicit direction is reported and never silently defaulted', () => {
  for (const type of [TRANSACTION_TYPE.SETTLEMENT, TRANSACTION_TYPE.GOODS_EXCHANGE]) {
    const result = buildTransactionForm({ ...base, TransactionType: type, Direction: '' });
    assert.ok(result.Missing.includes(FORM_KEY.DIRECTION));
    assert.equal(result.Draft.Direction, null);
  }
});

test('Phase 4B.26.3: selected explicit direction is preserved exactly in the draft', () => {
  for (const direction of ['Credit', 'Debit']) {
    const result = buildTransactionForm({ ...base, TransactionType: TRANSACTION_TYPE.SETTLEMENT, Direction: direction });
    assert.equal(result.Draft.Direction, direction);
    assert.equal(result.Missing.includes(FORM_KEY.DIRECTION), false);
  }
});

test('Phase 4B.26.3: cash options carry explicit opposite cash-flow descriptions', () => {
  const options = transactionTypeOptions();
  assert.match(options.find(x => x.value === TRANSACTION_TYPE.CASH_RECEIVED).label, /أموال تدخل الشركة/);
  assert.match(options.find(x => x.value === TRANSACTION_TYPE.CASH_PAID).label, /أموال تخرج من الشركة/);
  const received = renderDynamicFields({ transactionType: TRANSACTION_TYPE.CASH_RECEIVED });
  const paid = renderDynamicFields({ transactionType: TRANSACTION_TYPE.CASH_PAID });
  assert.match(received, /استلام نقدية من المورد/);
  assert.match(received, /تزيد الخزينة/);
  assert.match(paid, /دفع نقدية إلى المورد/);
  assert.match(paid, /تنقص الخزينة/);
  assert.match(received, /cash-type-confirmation/);
  assert.match(paid, /cash-type-confirmation/);
});

test('Phase 4B.26.3: sidebar has a dedicated record-movement action to the existing add form', () => {
  const html = navigation({ activeRouteId: 'transactions' });
  assert.match(html, /app-nav__quick-action/);
  assert.match(html, /data-route-id="transactions-add"/);
  assert.ok(html.includes(`#${transactionAddPath()}`));
});


test('Phase 4B.26.4: cash movement requires acknowledgement, review, and explicit final confirmation', async () => {
  const controls = {};
  const handlers = {};
  const region = {
    innerHTML: '', attributes: {}, isConnected: true,
    setAttribute(name, value) { this.attributes[name] = value; },
    querySelector(selector) {
      if (!selector.startsWith('#')) return null;
      const id = selector.slice(1);
      if (!controls[id]) controls[id] = { id, value: '', checked: false, innerHTML: '', disabled: false, setAttribute() {}, getAttribute() { return null; } };
      return controls[id];
    }
  };
  controls['transaction-form'] = { id: 'transaction-form', value: '' };
  const container = {
    querySelector(selector) { return selector === `#${TRANSACTION_FORM_REGION_ID}` ? region : null; },
    addEventListener(type, handler) { handlers[type] = handler; }
  };
  let writes = 0;
  const services = {
    ...transactionFormService,
    currentIsoDate: () => '2026-11-11',
    listSelectableCustomers: async () => [],
    getDefaultPackageWeight: async () => 14,
    submitTransactionForm: async (form) => {
      writes += 1;
      return { Record: { TransactionType: form.TransactionType, AmountMinor: 10000 }, Customer: { Id: form.CustomerId }, CustomerId: form.CustomerId };
    }
  };
  const view = initTransactionFormView({ container, services, autoLoad: false });
  await view.reload();
  const change = (id, value, checked = undefined) => handlers.change({ preventDefault() {}, target: { getAttribute: (name) => name === 'id' ? id : null, value, checked } });
  const typeControl = region.querySelector(`#${FIELD_ID.TransactionType}`);
  typeControl.value = TRANSACTION_TYPE.CASH_RECEIVED;
  handlers.change({ preventDefault() {}, target: { getAttribute: (name) => name === 'id' ? FIELD_ID.TransactionType : null, value: TRANSACTION_TYPE.CASH_RECEIVED } });
  for (const [key, value] of [['CustomerId', 'customer-1'], ['Date', '2026-11-11'], ['Amount', '100']]) {
    const id = FIELD_ID[key];
    region.querySelector(`#${id}`).value = value;
    change(id, value);
  }
  assert.equal(await view.submit(), null);
  assert.equal(writes, 0);
  assert.match(region.innerHTML, /يجب تأكيد نوع الحركة وأثرها النقدي/);
  region.querySelector('#cash-type-confirmation').checked = true;
  change('cash-type-confirmation', 'on', true);
  handlers.submit({ preventDefault() {} });
  assert.equal(view.state().reviewOpen, true, 'the form submit opens the review step');
  assert.equal(writes, 0, 'opening the review screen must not write');
  assert.match(region.innerHTML, /مراجعة وتأكيد الحركة/);
  handlers.click({ target: { closest: (selector) => selector === '[data-action="confirm-transaction-review"]' ? {} : null } });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(writes, 1, 'only the final modal confirmation reaches the write service');
});


test('Phase 4B.26.3: directional preview visibly includes selected direction and service-projected balance', () => {
  const html = renderDirectionalPreview({ preview: {
    Code: 'F-01', Name: 'مزارع الاختبار', TransactionType: TRANSACTION_TYPE.SETTLEMENT,
    Direction: 'Debit', AmountMinor: 12500, CurrentBalanceMinor: 50000,
    ProjectedBalanceMinor: 37500, Insufficient: false, IncreasesDebt: false
  } });
  assert.match(html, /اتجاه الحركة/);
  assert.match(html, /خصم من رصيد المورد — مدين/);
  assert.match(html, /الرصيد المتوقع بعد الحركة/);
  assert.match(html, /375\.00/);
});

test('Phase 4B.26.3: negative projected settlement balance requires explicit confirmation panel', () => {
  const html = renderDirectionalPreview({ preview: {
    Code: 'F-02', Name: 'مزارع الاختبار', TransactionType: TRANSACTION_TYPE.GOODS_EXCHANGE,
    Direction: 'Debit', AmountMinor: 50000, CurrentBalanceMinor: 10000,
    ProjectedBalanceMinor: -40000, Insufficient: true, IncreasesDebt: true
  }, awaitingConfirm: true });
  assert.match(html, /ستجعل رصيد المورد سالبًا/);
  assert.match(html, /confirm-directional-settlement/);
});


test('Phase 4B.26.4: direct confirmation without opening the review screen is blocked', async () => {
  let writes = 0;
  const controls = {};
  const region = { innerHTML: '', setAttribute() {}, querySelector(selector) { const id = selector.slice(1); return controls[id] || (controls[id] = { value: '', setAttribute() {} }); } };
  controls['transaction-form'] = {};
  const container = { querySelector: () => region, addEventListener() {} };
  const services = { ...transactionFormService, currentIsoDate: () => '2026-11-12', submitTransactionForm: async () => { writes += 1; return {}; } };
  const view = initTransactionFormView({ container, services, autoLoad: false });
  assert.equal(await view.confirmAndSave(), null);
  assert.equal(writes, 0);
});


test('Phase 4B.26.4: review modal presents cash flow and final action distinctly', () => {
  const html = renderTransactionReviewModal({
    values: { TransactionType: TRANSACTION_TYPE.CASH_RECEIVED, CustomerId: 'customer-1', Date: '2026-11-12', Amount: '125.50', Description: 'دفعة توريد' },
    customers: [{ Id: 'customer-1', Code: 'F-12', Name: 'مزارع الاختبار' }]
  });
  assert.match(html, /مراجعة وتأكيد الحركة/);
  assert.match(html, /استلام نقدية — أموال تدخل الشركة/);
  assert.match(html, /مزارع الاختبار/);
  assert.match(html, /125\.50/);
  assert.match(html, /تأكيد وحفظ الحركة/);
  assert.match(html, /رجوع للتعديل/);
});

test('Phase 4B.26.4: crop and carton review details use their own fields and service totals', () => {
  const crop = renderTransactionReviewModal({
    values: { TransactionType: TRANSACTION_TYPE.CROP_PURCHASE_LOCAL, CustomerId: 'customer-1', Date: '2026-11-12', Units: '45', LooseKg: '3', DeductionKg: '1', UnitPrice: '22.5' },
    customers: [{ Id: 'customer-1', Code: 'F-12', Name: 'مزارع الاختبار' }],
    preview: { PackageWeightKg: 14, NetWeightMilli: 626000, AmountMinor: 1408500 }
  });
  assert.match(crop, /عدد العبوات/);
  assert.match(crop, /سعر الكيلو/);
  assert.match(crop, /626\.000 كجم/);
  assert.match(crop, /14,085\.00/);
  assert.doesNotMatch(crop, /field-Amount/);

  const carton = renderTransactionReviewModal({
    values: { TransactionType: TRANSACTION_TYPE.CROP_PURCHASE_CARTON, CustomerId: 'customer-1', Date: '2026-11-12', ReceivingCompanyId: 'company-1', CartonTypeId: 'carton-1', CartonQuantity: '15', CartonDiscount: '2', CartonPrice: '18' },
    customers: [{ Id: 'customer-1', Code: 'F-12', Name: 'مزارع الاختبار' }],
    referenceOptions: { ReceivingCompanies: [{ Id: 'company-1', Name: 'جرين طيبه' }], CartonTypes: [{ Id: 'carton-1', Name: 'فلات' }] },
    preview: { AmountMinor: 23400 }
  });
  assert.match(carton, /جرين طيبه/);
  assert.match(carton, /فلات/);
  assert.match(carton, /عدد الكراتين/);
  assert.match(carton, /234\.00/);
});

test('Phase 4B.26.4: transaction form uses the redesigned structured layout and review-first action', () => {
  const html = renderTransactionForm({
    customers: [{ Id: 'customer-1', Code: 'F-12', Name: 'مزارع الاختبار' }],
    transactionType: TRANSACTION_TYPE.CASH_PAID,
    values: { TransactionType: TRANSACTION_TYPE.CASH_PAID, CustomerId: 'customer-1', Date: '2026-11-12', Amount: '50', Description: '' }
  });
  assert.match(html, /transaction-entry__intro/);
  assert.match(html, /transaction-entry__panel--primary/);
  assert.match(html, /transaction-entry__panel--details/);
  assert.match(html, /مراجعة الحركة/);
  assert.doesNotMatch(html, /type="submit"[^>]*>\s*حفظ الحركة/);
});


test('Phase 4B.26.4: transaction types are offered as clear selectable tiles with a keyboard-accessible control', () => {
  const html = renderTransactionTypePicker(TRANSACTION_TYPE.CASH_PAID);
  assert.match(html, /transaction-type-tile--cash-in/);
  assert.match(html, /transaction-type-tile--cash-out is-selected/);
  assert.match(html, /النقدية تدخل الشركة/);
  assert.match(html, /النقدية تخرج من الشركة/);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /id="field-TransactionType"/);
});
