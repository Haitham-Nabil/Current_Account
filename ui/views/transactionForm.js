import { authService } from '../../src/services/authService.js';
// Add Transaction screen (Phase 4B.3). It collects input and delegates: every
// financial decision — direction, cash / non-cash, crop value and balance — is
// made below the UI. This module never imports the data layer, never contains a
// financial engine and never writes a balance figure of its own.
import { pageHeader, card, alert, attrs } from '../components/index.js';
import { loadingState } from '../components/states.js';
import { escapeHtml } from '../components/html.js';
import { formatMoneyMinor, formatQuantityMinor, formatText } from '../../src/utils/formatting.js';
import { logger } from '../../src/utils/logger.js';
import { customerAccountPath, customerListPath } from '../routes.js';
import { buildHash } from '../router.js';
import { settlementService } from '../../src/services/settlementService.js';
import {
  transactionFormService,
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LABELS_AR,
  TRANSACTION_TYPE,
  isCropPurchaseType,
  FORM_KEY,
  emptyForm,
  previewTransfer,
  // Phase 4B.11 — the two reference catalogues, read and created through services only.
  listReferenceOptions,
  createReceivingCompany,
  createCartonType,
  // Phase 4B.13.1 — the strawberry variety catalogue, through the same facade.
  createStrawberryVariety
} from '../../src/services/transactionFormService.js';

export const TRANSACTION_FORM_REGION_ID = 'transaction-form-region';
export const DYNAMIC_FIELDS_ID = 'dynamic-fields';
export const CROP_PREVIEW_ID = 'crop-preview';
export const FORM_ERROR_ID = 'transaction-form-error';
export const SUCCESS_REGION_ID = 'transaction-success';
// Phase 4B.9 — Debt transfer: the read-only two-sided preview and its explicit
// confirmation panel.
export const TRANSFER_PREVIEW_ID = 'transfer-preview';
export const DIRECTION_PREVIEW_ID = 'direction-preview';
export const TRANSFER_CONFIRM_ID = 'transfer-confirm';
export const TRANSFER_CONFIRM_SUBMIT_ID = 'transfer-confirm-submit';
// Phase 4B.11 — the inline "add a new reference record" panel used by the carton fields.
export const REFERENCE_PANEL_ID = 'reference-add-panel';
export const REFERENCE_PANEL_INPUT_ID = 'reference-add-name';
export const REFERENCE_PANEL_ERROR_ID = 'reference-add-error';
export const TRANSACTION_REVIEW_ID = 'transaction-review-modal';
export const TRANSACTION_REVIEW_CONFIRM_ID = 'transaction-review-confirm';

export const FIELD_ID = Object.freeze({
  TransactionType: 'field-TransactionType',
  CustomerId: 'field-CustomerId',
  CustomerSearch: 'customer-search',
  FromCustomerId: 'field-FromCustomerId',
  ToCustomerId: 'field-ToCustomerId',
  Date: 'field-Date',
  Description: 'field-Description',
  Amount: 'field-Amount',
  Units: 'field-Units',
  LooseKg: 'field-LooseKg',
  DeductionKg: 'field-DeductionKg',
  UnitPrice: 'field-UnitPrice',
  CartonQuantity: 'field-CartonQuantity',
  CartonDiscount: 'field-CartonDiscount',
  CartonPrice: 'field-CartonPrice',
  ReceivingCompanyId: 'field-ReceivingCompanyId',
  CartonTypeId: 'field-CartonTypeId',
  StrawberryVarietyId: 'field-StrawberryVarietyId',
  Direction: 'field-Direction'
});

export const FIELD_LABEL = Object.freeze({
  CustomerId: 'المورد',
  FromCustomerId: 'المورد الدائن (الطرف الأول)',
  ToCustomerId: 'المورد المدين (الطرف الثاني)',
  Date: 'التاريخ',
  Description: 'البيان (اختياري)',
  Amount: 'المبلغ',
  Units: 'عدد العبوات (D)',
  LooseKg: 'الكيلو السائب (E)',
  DeductionKg: 'خصم الكيلو (F)',
  UnitPrice: 'سعر الكيلو (H)',
  CartonQuantity: 'الكمية (K)',
  CartonDiscount: 'خصم المبلغ (M)',
  CartonPrice: 'السعر (L)',
  ReceivingCompanyId: 'الشركة المستلمة للمحصول',
  CartonTypeId: 'نوع الكرتونة',
  StrawberryVarietyId: 'صنف الفراولة',
  Direction: 'اتجاه الحركة'
});

// Display-only description of the approved meaning of each type. It is copy, not a
// rule: nothing downstream reads it and no direction is derived from it.
export const TYPE_NOTE = Object.freeze({
  [TRANSACTION_TYPE.SALE_PESTICIDES]: 'بيع مبيدات يُسجَّل مدينًا على المورد.',
  [TRANSACTION_TYPE.SALE_IRRIGATION]: 'بيع شبكات ري يُسجَّل مدينًا على المورد.',
  [TRANSACTION_TYPE.SALES_RETURN]: 'مرتجع مبيعات يُسجَّل دائنًا للمورد.',
  [TRANSACTION_TYPE.CROP_PURCHASE_LOCAL]: 'تُحتسب القيمة من بيانات المحصول وإعداد الوزن الافتراضي للعبوة؛ لا يُدخل المبلغ يدويًا. صنف الفراولة بيان مرجعي وصفى بلا أثر مالي.',
  [TRANSACTION_TYPE.CROP_PURCHASE_CARTON]: 'تُحتسب القيمة من عدد الكراتين وسعرها؛ الشركة المستلمة ونوع الكرتونة بيانات مرجعية فقط وبلا أثر مالي.',
  [TRANSACTION_TYPE.CASH_RECEIVED]: 'استلام أموال من المورد: النقدية تدخل الشركة وتزيد الخزينة، ويُسجَّل الأثر على حساب المورد وفق القواعد الحالية.',
  [TRANSACTION_TYPE.CASH_PAID]: 'دفع أموال للمورد: النقدية تخرج من الشركة وتنقص الخزينة، ويُسجَّل الأثر على حساب المورد وفق القواعد الحالية.',
  [TRANSACTION_TYPE.SETTLEMENT]: 'تسوية غير نقدية؛ اختر اتجاهها صراحة: إضافة إلى رصيد المورد أو خصم من رصيده. لا توجد حركة نقدية.',
  [TRANSACTION_TYPE.GOODS_EXCHANGE]: 'تبادل بضائع غير نقدي؛ اختر اتجاهه صراحة: إضافة إلى رصيد المورد أو خصم من رصيده. لا توجد حركة نقدية.',
  [TRANSACTION_TYPE.DEBT_TRANSFER]: 'تحويل مديونية بين موردين؛ لا حركة نقدية معه.'
});

// Phase 4B.9 — Debt transfer: the two parties, a read-only preview filled by the
// services layer, and one explicit confirmation when the receiving side would go
// negative. The screen prints the values the service returned; it computes none.
export const TRANSFER_ROLE_LABEL_AR = Object.freeze({ CreditSide: 'دائن', DebitSide: 'مدين' });
export const SAME_CUSTOMER_MESSAGE = 'لا يمكن اختيار المورد نفسه في الطرفين؛ اختر موردين مختلفين.';
export const TRANSFER_CONFIRM_MESSAGE = 'رصيد المورد المحوّل إليه لا يكفي لتغطية التحويل؛ سيصبح رصيده سالبًا. أكّد المتابعة للحفظ.';

export function isTransferType(transactionType) {
  return transactionType === TRANSACTION_TYPE.DEBT_TRANSFER;
}

function textOf(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

// The two parties of a transfer, read straight from the form values.
export function transferParties(values = {}) {
  const from = textOf(values[FORM_KEY.FROM_CUSTOMER]);
  const to = textOf(values[FORM_KEY.TO_CUSTOMER]);
  return { FromCustomerId: from, ToCustomerId: to, Same: Boolean(from) && from === to };
}

function moneyCell(value) {
  return Number.isInteger(value) ? formatMoneyMinor(value) : EMPTY_VALUE;
}

function transferPartyLabel(party) {
  const parts = [formatText(party && party.Code), formatText(party && party.Name)].filter(Boolean);
  return parts.length ? parts.join(' — ') : EMPTY_VALUE;
}

function transferPreviewItem(label, value) {
  return `<span class="preview-item"><span class="preview-item__label">${escapeHtml(label)}</span><span class="preview-item__value">${escapeHtml(value)}</span></span>`;
}

// Presentation of the preview the service returned. Nothing is derived here: the
// current and the projected balance of both sides, the amount and the cash impact
// are all values read back from the services layer.
export function renderTransferPreview({ preview = null, awaitingConfirm = false } = {}) {
  const items = [];
  let warning = '';
  let panel = '';
  if (!preview) {
    items.push(transferPreviewItem('الحالة', 'اختر الطرفين وأدخل المبلغ والتاريخ لعرض معاينة الأثر على الحسابين.'));
  } else if (preview.Valid !== true) {
    items.push(transferPreviewItem('الحالة', preview.Message || 'تعذّر إعداد المعاينة.'));
  } else {
    items.push(transferPreviewItem('المورد المحوّل منه', transferPartyLabel(preview.From)));
    items.push(transferPreviewItem('رصيده الحالي', moneyCell(preview.From.CurrentBalanceMinor)));
    items.push(transferPreviewItem('رصيده المتوقع بعد التحويل', moneyCell(preview.From.ProjectedBalanceMinor)));
    items.push(transferPreviewItem('المورد المحوّل إليه', transferPartyLabel(preview.To)));
    items.push(transferPreviewItem('رصيده الحالي', moneyCell(preview.To.CurrentBalanceMinor)));
    items.push(transferPreviewItem('رصيده المتوقع بعد التحويل', moneyCell(preview.To.ProjectedBalanceMinor)));
    items.push(transferPreviewItem('مبلغ التحويل', moneyCell(preview.AmountMinor)));
    items.push(transferPreviewItem('الأثر النقدي', moneyCell(preview.CashImpactMinor)));
    if (preview.Insufficient === true) {
      warning = alert({ tone: 'warning', title: 'تحذير: الرصيد غير كافٍ', message: TRANSFER_CONFIRM_MESSAGE });
      panel = awaitingConfirm
        ? `<div class="confirm-panel" id="${TRANSFER_CONFIRM_ID}"><button class="btn btn--primary" type="button" id="${TRANSFER_CONFIRM_SUBMIT_ID}" data-action="confirm-transfer">تأكيد الحفظ</button><button class="btn btn--outline" type="button" data-action="dismiss-confirm">رجوع</button></div>`
        : `<div class="confirm-panel" id="${TRANSFER_CONFIRM_ID}"></div>`;
    }
  }
  return card({
    title: 'معاينة التحويل (عرض فقط)',
    body: `<p class="text-sm text-muted">الأرصدة المعروضة تقرأها الشاشة من طبقة الخدمات؛ لا تُحسب هنا ولا يمكن تعديلها من النموذج.</p>
<div class="preview-grid">${items.join('')}</div>${warning}${panel}`
  });
}

const BALANCE_SIDE_TEXT = Object.freeze({
  Credit: 'رصيد لصالح المورد',
  Debit: 'رصيد على المورد',
  Zero: 'رصيد متعادل'
});

const EMPTY_VALUE = '—';

export function customerLabel(customer) {
  const code = formatText(customer && customer.Code);
  const name = formatText(customer && customer.Name);
  const parts = [code, name].filter(Boolean);
  return parts.length ? parts.join(' — ') : `مورد ${EMPTY_VALUE}`;
}

function controlIdFor(key) {
  return FIELD_ID[key] || `field-${key}`;
}

function textControl({ key, value, invalid = false, hintId = null, type = 'text', inputmode = null, step = null, min = null }) {
  return `<input class="input" ${attrs({
    id: controlIdFor(key),
    type,
    value: value === '' || value === null || value === undefined ? null : value,
    inputmode,
    step,
    min,
    'aria-invalid': invalid ? 'true' : null,
    'aria-describedby': hintId
  })}>`;
}

function numberControl({ key, value, invalid = false, hintId = null }) {
  return textControl({ key, value, invalid, hintId, type: 'number', inputmode: 'decimal', step: 'any', min: '0' });
}

function selectControl({ key, options, selected = null, disabled = false, invalid = false, hintId = null }) {
  return `<select class="select" ${attrs({ id: controlIdFor(key), disabled, 'aria-invalid': invalid ? 'true' : null, 'aria-describedby': hintId })}>${
    options.map((option) => `<option value="${escapeHtml(option.value)}"${option.value === selected ? ' selected' : ''}>${escapeHtml(option.label)}</option>`).join('')
  }</select>`;
}

// One labelled field. A validation error is bound to its control through
// aria-describedby, so it is announced and not merely coloured.
export function fieldBlock({ key, label = null, control, hint = null, error = null }) {
  const id = controlIdFor(key);
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');
  let bound = control;
  if (describedBy && typeof bound === 'string' && !bound.includes('aria-describedby')) {
    bound = bound.replace('<input', `<input aria-describedby="${describedBy}"`).replace('<select', `<select aria-describedby="${describedBy}"`);
  }
  return `<div class="field">
  <label class="field__label" for="${escapeHtml(id)}">${escapeHtml(label || FIELD_LABEL[key] || key)}</label>
  ${bound}
  ${hint ? `<span class="field__hint" id="${escapeHtml(hintId)}">${escapeHtml(hint)}</span>` : ''}
  ${error ? `<span class="field__error" id="${escapeHtml(errorId)}">${escapeHtml(error)}</span>` : ''}
</div>`;
}

export function transactionTypeOptions() {
  return TRANSACTION_TYPES.map((type) => {
    if (type === TRANSACTION_TYPE.CASH_RECEIVED) return { value: type, label: 'استلام نقدية — أموال تدخل الشركة (+ نقدية)' };
    if (type === TRANSACTION_TYPE.CASH_PAID) return { value: type, label: 'دفع نقدية — أموال تخرج من الشركة (− نقدية)' };
    return { value: type, label: TRANSACTION_TYPE_LABELS_AR[type] || type };
  });
}


const TRANSACTION_TYPE_TILES = Object.freeze({
  [TRANSACTION_TYPE.SALE_PESTICIDES]: { icon: '🧪', hint: 'مبيعات ومديونية', tone: 'sales' },
  [TRANSACTION_TYPE.SALE_IRRIGATION]: { icon: '💧', hint: 'مبيعات ومديونية', tone: 'sales' },
  [TRANSACTION_TYPE.SALES_RETURN]: { icon: '↩', hint: 'مرتجع للمورد', tone: 'return' },
  [TRANSACTION_TYPE.CROP_PURCHASE_LOCAL]: { icon: '🍓', hint: 'شراء محصول بالوزن', tone: 'crop' },
  [TRANSACTION_TYPE.CROP_PURCHASE_CARTON]: { icon: '📦', hint: 'شراء كراتين بالعدد', tone: 'crop' },
  [TRANSACTION_TYPE.CASH_RECEIVED]: { icon: '↓', hint: 'النقدية تدخل الشركة', tone: 'cash-in' },
  [TRANSACTION_TYPE.CASH_PAID]: { icon: '↑', hint: 'النقدية تخرج من الشركة', tone: 'cash-out' },
  [TRANSACTION_TYPE.SETTLEMENT]: { icon: '⇄', hint: 'حركة غير نقدية', tone: 'noncash' },
  [TRANSACTION_TYPE.GOODS_EXCHANGE]: { icon: '⟷', hint: 'تبادل غير نقدي', tone: 'noncash' },
  [TRANSACTION_TYPE.DEBT_TRANSFER]: { icon: '↔', hint: 'بين حسابَي موردين', tone: 'transfer' }
});

export function renderTransactionTypePicker(selected = '') {
  const tiles = TRANSACTION_TYPES.map((type) => {
    const meta = TRANSACTION_TYPE_TILES[type];
    const active = type === selected;
    return `<button type="button" class="transaction-type-tile transaction-type-tile--${meta.tone}${active ? ' is-selected' : ''}" data-action="select-transaction-type" data-type="${escapeHtml(type)}" aria-pressed="${active ? 'true' : 'false'}"><span class="transaction-type-tile__icon" aria-hidden="true">${meta.icon}</span><span class="transaction-type-tile__copy"><strong>${escapeHtml(TRANSACTION_TYPE_LABELS_AR[type] || type)}</strong><small>${escapeHtml(meta.hint)}</small></span><span class="transaction-type-tile__check" aria-hidden="true">✓</span></button>`;
  }).join('');
  const options = [{ value: '', label: '— اختر نوع الحركة —' }].concat(transactionTypeOptions());
  return `<div class="transaction-type-picker"><div class="transaction-type-picker__grid" role="group" aria-label="أنواع الحركات">${tiles}</div><select class="select visually-hidden transaction-type-picker__select" id="${FIELD_ID.TransactionType}" aria-label="نوع الحركة">${options.map((option) => `<option value="${escapeHtml(option.value)}"${option.value === selected ? ' selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}</select></div>`;
}

const EXPLICIT_DIRECTION_OPTIONS = Object.freeze([
  { value: '', label: '— اختر اتجاه الحركة —' },
  { value: 'Credit', label: 'إضافة إلى رصيد المورد — دائن' },
  { value: 'Debit', label: 'خصم من رصيد المورد — مدين' }
]);

function cashSafetyPanel(transactionType, acknowledged = false, error = null) {
  if (transactionType !== TRANSACTION_TYPE.CASH_RECEIVED && transactionType !== TRANSACTION_TYPE.CASH_PAID) return '';
  const received = transactionType === TRANSACTION_TYPE.CASH_RECEIVED;
  const title = received ? 'استلام نقدية من المورد' : 'دفع نقدية إلى المورد';
  const effect = received ? 'النقدية تدخل الشركة وتزيد الخزينة' : 'النقدية تخرج من الشركة وتنقص الخزينة';
  const symbol = received ? '+' : '−';
  const tone = received ? 'cash-received' : 'cash-paid';
  const confirmation = received ? 'أؤكد أنني أسجل استلام أموال من المورد لصالح الشركة.' : 'أؤكد أنني أسجل دفع أموال من الشركة إلى المورد.';
  return `<section class="cash-direction-card cash-direction-card--${tone}" aria-labelledby="cash-direction-title">
  <div class="cash-direction-card__heading"><span class="cash-direction-card__symbol" aria-hidden="true">${symbol}</span><div><h3 id="cash-direction-title">${escapeHtml(title)}</h3><p>${escapeHtml(effect)}</p></div></div>
  <label class="cash-direction-card__confirm"><input id="cash-type-confirmation" type="checkbox"${acknowledged ? ' checked' : ''}><span>${escapeHtml(confirmation)}</span></label>
  ${error ? `<p class="field__error" role="alert">${escapeHtml(error)}</p>` : ''}
</section>`;
}

export function customerOptions(customers = []) {
  return [{ value: '', label: '— اختر المورد —' }].concat(
    customers.map((customer) => ({ value: customer.Id, label: customerLabel(customer) }))
  );
}

export function typeNote(transactionType) {
  return TYPE_NOTE[transactionType] || null;
}

// Phase 4B.11 — the two reference choices of a carton purchase. Both lists show the
// ACTIVE records only (an inactive record cannot enter a new movement) plus the value the
// form already carries, so an existing choice is never silently dropped. The screen only
// prints what the services returned.
export function referenceOptionsFor(kind, { referenceOptions = null, selected = null } = {}) {
  const source = referenceOptions || {};
  const rows = kind === 'ReceivingCompany'
    ? source.ReceivingCompanies
    : (kind === 'StrawberryVariety' ? source.StrawberryVarieties : source.CartonTypes);
  const list = Array.isArray(rows) ? rows : [];
  const options = [{ value: '', label: '— غير محدد —' }];
  for (const row of list) {
    if (row.IsActive === false && row.Id !== selected) continue;
    const suffix = row.IsActive === false ? ' (غير نشطة)' : '';
    options.push({ value: row.Id, label: `${row.Name}${suffix}` });
  }
  if (selected && !options.some((option) => option.value === selected)) {
    options.push({ value: selected, label: 'سجل غير متاح (غير نشط أو محذوف)' });
  }
  return options;
}

const ADD_LABEL = Object.freeze({
  ReceivingCompany: 'إضافة شركة مستلمة جديدة',
  CartonType: 'إضافة نوع كرتونة جديد',
  StrawberryVariety: 'إضافة صنف فراولة جديد'
});

const ADD_ACTION = Object.freeze({
  ReceivingCompany: 'add-receiving-company',
  CartonType: 'add-carton-type',
  StrawberryVariety: 'add-strawberry-variety'
});

function referenceAddButton(kind) {
  return `<button class="btn btn--outline btn--small" type="button" data-action="${ADD_ACTION[kind]}" data-reference-kind="${kind}">${escapeHtml(ADD_LABEL[kind])}</button>`;
}

// The inline add panel. It writes ONE reference record through the services layer and
// never creates a movement, an amount or a balance.
export function renderReferenceAddPanel({ panel = null } = {}) {
  if (!panel || !panel.kind) return '';
  const label = panel.kind === 'ReceivingCompany'
    ? 'اسم الشركة المستلمة'
    : (panel.kind === 'StrawberryVariety' ? 'اسم صنف الفراولة' : 'اسم نوع الكرتونة');
  const error = panel.error ? `<span class="field__error" id="${REFERENCE_PANEL_ERROR_ID}">${escapeHtml(panel.error)}</span>` : '';
  const busy = panel.busy === true;
  return `<div class="reference-add" id="${REFERENCE_PANEL_ID}" data-reference-kind="${escapeHtml(panel.kind)}">
  <label class="field__label" for="${REFERENCE_PANEL_INPUT_ID}">${escapeHtml(label)}</label>
  <div class="row">
    <input class="input" id="${REFERENCE_PANEL_INPUT_ID}" type="text" value="${escapeHtml(panel.name || '')}" ${busy ? 'disabled' : ''} aria-describedby="${REFERENCE_PANEL_ERROR_ID}">
    <button class="btn btn--primary btn--small" type="button" data-action="save-reference"${busy ? ' disabled aria-disabled="true"' : ''}>حفظ</button>
    <button class="btn btn--outline btn--small" type="button" data-action="cancel-reference"${busy ? ' disabled aria-disabled="true"' : ''}>إلغاء</button>
  </div>
  ${error}
</div>`;
}

// Directional movement preview. Every balance and financial amount is supplied by
// settlementService; this renderer only labels and formats the returned projection.
export function renderDirectionalPreview({ preview = null, awaitingConfirm = false } = {}) {
  if (!preview) {
    return card({ title: 'معاينة اتجاه الحركة والأثر على الرصيد', body: '<p class="text-sm text-muted">اختر المورد والاتجاه وأدخل المبلغ لعرض المعاينة قبل الحفظ.</p>' });
  }
  const direction = preview.Direction === 'Credit' ? 'إضافة إلى رصيد المورد — دائن' : 'خصم من رصيد المورد — مدين';
  const items = [
    transferPreviewItem('المورد', [formatText(preview.Code), formatText(preview.Name)].filter(Boolean).join(' — ') || EMPTY_VALUE),
    transferPreviewItem('نوع الحركة', TRANSACTION_TYPE_LABELS_AR[preview.TransactionType] || preview.TransactionType),
    transferPreviewItem('اتجاه الحركة', direction),
    transferPreviewItem('المبلغ', moneyCell(preview.AmountMinor)),
    transferPreviewItem('الرصيد الحالي', moneyCell(preview.CurrentBalanceMinor)),
    transferPreviewItem('الرصيد المتوقع بعد الحركة', moneyCell(preview.ProjectedBalanceMinor))
  ];
  const warning = preview.Insufficient === true
    ? alert({ tone: 'warning', title: 'تنبيه: الرصيد الدائن غير كافٍ', message: 'هذه الحركة ستجعل رصيد المورد سالبًا. راجع الاتجاه والمبلغ قبل تأكيد الحفظ.' })
    : (preview.IncreasesDebt === true ? alert({ tone: 'info', title: 'تنبيه', message: 'سيظل رصيد المورد مدينًا بعد هذه الحركة.' }) : '');
  const confirmation = preview.Insufficient === true
    ? (awaitingConfirm
      ? `<div class="confirm-panel"><button class="btn btn--primary" type="button" data-action="confirm-directional-settlement">تأكيد الحفظ بعد المراجعة</button><button class="btn btn--outline" type="button" data-action="dismiss-directional-confirm">رجوع للمراجعة</button></div>`
      : '<div class="confirm-panel"></div>')
    : '';
  return card({
    title: 'معاينة اتجاه الحركة والأثر على الرصيد',
    body: `<p class="text-sm text-muted">المعاينة من طبقة الخدمات، ولا يتم حساب الرصيد داخل الشاشة.</p><div class="preview-grid">${items.join('')}</div>${warning}${confirmation}`
  });
}

// Dynamic fields for one type (spec §7, §25): only the fields that type needs.
// No crop purchase ever renders an Amount control; the crop value is derived.
export function renderDynamicFields({
  transactionType = '',
  values = null,
  fieldErrors = {},
  preview = null,
  awaitingConfirm = false,
  referenceOptions = null,
  referencePanel = null,
  cashAcknowledged = false,
  awaitingSettlementConfirm = false
} = {}) {
  if (!transactionType) {
    return '<p class="text-sm text-muted">اختر نوع الحركة لعرض الحقول المطلوبة.</p>';
  }
  const form = values || emptyForm({ transactionType });
  const errorFor = (key) => fieldErrors[key] || null;
  const keys = transactionFormService.formFields(transactionType);
  const blocks = [];
  for (const key of keys) {
    if (key === FORM_KEY.CUSTOMER || key === FORM_KEY.FROM_CUSTOMER || key === FORM_KEY.TO_CUSTOMER || key === FORM_KEY.DATE) continue;
    if (key === FORM_KEY.DIRECTION) {
      blocks.push(fieldBlock({
        key,
        control: selectControl({ key, options: EXPLICIT_DIRECTION_OPTIONS, selected: form[key] || '', invalid: Boolean(errorFor(key)) }),
        hint: 'الاتجاه يحدد هل تُضاف القيمة إلى رصيد المورد أم تُخصم منه. لن يتم افتراض اتجاه تلقائي.',
        error: errorFor(key)
      }));
      continue;
    }
    if (key === FORM_KEY.DESCRIPTION) {
      blocks.push(fieldBlock({ key, control: textControl({ key, value: form[key], invalid: Boolean(errorFor(key)) }), error: errorFor(key) }));
      continue;
    }
    // Phase 4B.11 / 4B.13.1 — the reference choices, each with its own "add new" action:
    // the carton pairs and the strawberry variety of a local purchase.
    if (key === FORM_KEY.RECEIVING_COMPANY || key === FORM_KEY.CARTON_TYPE || key === FORM_KEY.STRAWBERRY_VARIETY) {
      const kind = key === FORM_KEY.RECEIVING_COMPANY
        ? 'ReceivingCompany'
        : (key === FORM_KEY.STRAWBERRY_VARIETY ? 'StrawberryVariety' : 'CartonType');
      const control = `${selectControl({
        key,
        options: referenceOptionsFor(kind, { referenceOptions, selected: form[key] }),
        selected: form[key] || '',
        invalid: Boolean(errorFor(key))
      })}<div class="row row--wrap reference-actions">${referenceAddButton(kind)}</div>`;
      blocks.push(fieldBlock({ key, control, error: errorFor(key) }));
      continue;
    }
    if (key === FORM_KEY.AMOUNT) {
      blocks.push(fieldBlock({ key, control: numberControl({ key, value: form[key], invalid: Boolean(errorFor(key)) }), error: errorFor(key) }));
      continue;
    }
    const isPrice = key === FORM_KEY.UNIT_PRICE || key === FORM_KEY.CARTON_DISCOUNT || key === FORM_KEY.CARTON_PRICE;
    blocks.push(fieldBlock({
      key,
      control: numberControl({ key, value: form[key], invalid: Boolean(errorFor(key)) }),
      hint: isPrice ? 'القيمة بالوحدات الرئيسية (مثال: 12.50).' : 'القيمة بالوحدات الرئيسية (مثال: 10.5).',
      error: errorFor(key)
    }));
  }
  const cropPreview = isCropPurchaseType(transactionType)
    ? `<div class="page-section" id="${CROP_PREVIEW_ID}">${renderCropPreview({ transactionType, preview })}</div>`
    : '';
  const transferPreview = isTransferType(transactionType)
    ? `<div class="page-section" id="${TRANSFER_PREVIEW_ID}">${renderTransferPreview({ preview, awaitingConfirm })}</div>`
    : '';
  const directionalPreview = transactionType === TRANSACTION_TYPE.SETTLEMENT || transactionType === TRANSACTION_TYPE.GOODS_EXCHANGE
    ? `<div class="page-section" id="${DIRECTION_PREVIEW_ID}">${renderDirectionalPreview({ preview, awaitingConfirm: awaitingSettlementConfirm })}</div>`
    : '';
  const cashSafety = cashSafetyPanel(transactionType, cashAcknowledged, fieldErrors.CashConfirmation || null);
  return `${cashSafety}<div class="grid grid--cols-2 transaction-fields-grid">${blocks.join('\n')}</div>${renderReferenceAddPanel({ panel: referencePanel })}${cropPreview}${transferPreview}${directionalPreview}`;
}

// Preview only: the numbers come from the approved calculator through the service
// layer. Nothing here is stored, and the user cannot edit the total.
export function renderCropPreview({ transactionType = '', preview = null } = {}) {
  const rows = [];
  if (preview) {
    if (preview.PackageWeightKg !== null && preview.PackageWeightKg !== undefined) {
      rows.push(`<li>الوزن الافتراضي للعبوة: ${escapeHtml(String(preview.PackageWeightKg))} كجم</li>`);
    }
    if (preview.NetWeightMilli !== null && preview.NetWeightMilli !== undefined) {
      rows.push(`<li>صافي الوزن المحسوب: ${escapeHtml(formatQuantityMinor(preview.NetWeightMilli))} كجم</li>`);
    }
    if (preview.AmountMinor !== null && preview.AmountMinor !== undefined) {
      rows.push(`<li>القيمة المحسوبة: ${escapeHtml(formatMoneyMinor(preview.AmountMinor))}</li>`);
    }
  }
  const body = rows.length
    ? `<ul class="preview-list">${rows.join('')}</ul>`
    : '<p class="text-sm text-muted">تُعرض القيمة المحسوبة هنا بعد إدخال بيانات المحصول. الحساب النهائي يتم في النظام عند الحفظ.</p>';
  return card({
    title: 'معاينة الحساب (عرض فقط)',
    body: `<p class="text-sm text-muted">هذه معاينة للعرض فقط، ولا تُخزَّن ولا يمكن تعديلها.</p>${body}`
  });
}

// A dedicated review surface. It displays the exact form values and service-derived
// previews; it performs no calculations and never writes data.
function reviewValue(label, value, emphasis = false) {
  return `<div class="transaction-review__item${emphasis ? ' transaction-review__item--emphasis' : ''}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || EMPTY_VALUE)}</strong></div>`;
}

export function renderTransactionReviewModal({
  values = {}, customers = [], referenceOptions = null, preview = null,
  warning = false, busy = false, lockedCustomerId = null
} = {}) {
  const type = values.TransactionType || '';
  const customerById = (id) => customers.find((row) => row.Id === id) || null;
  const customerName = (id) => {
    if (!id) return EMPTY_VALUE;
    const row = customerById(id);
    return row ? customerLabel(row) : `معرّف المورد: ${id}`;
  };
  const referenceName = (kind, id) => {
    if (!id) return EMPTY_VALUE;
    const rows = kind === 'ReceivingCompany' ? referenceOptions?.ReceivingCompanies
      : kind === 'CartonType' ? referenceOptions?.CartonTypes : referenceOptions?.StrawberryVarieties;
    return (Array.isArray(rows) ? rows.find((row) => row.Id === id)?.Name : null) || 'غير متاح';
  };
  const rows = [reviewValue('نوع الحركة', TRANSACTION_TYPE_LABELS_AR[type] || type)];
  if (type === TRANSACTION_TYPE.DEBT_TRANSFER) {
    rows.push(reviewValue('المورد المحوّل منه', customerName(values[FORM_KEY.FROM_CUSTOMER])));
    rows.push(reviewValue('المورد المحوّل إليه', customerName(values[FORM_KEY.TO_CUSTOMER])));
  } else {
    rows.push(reviewValue('المورد', customerName(lockedCustomerId || values[FORM_KEY.CUSTOMER])));
  }
  rows.push(reviewValue('التاريخ', values[FORM_KEY.DATE] || EMPTY_VALUE));

  const fieldRows = {
    [TRANSACTION_TYPE.SALE_PESTICIDES]: [['المبلغ', values.Amount]],
    [TRANSACTION_TYPE.SALE_IRRIGATION]: [['المبلغ', values.Amount]],
    [TRANSACTION_TYPE.SALES_RETURN]: [['المبلغ', values.Amount]],
    [TRANSACTION_TYPE.CASH_RECEIVED]: [['المبلغ المستلم', values.Amount]],
    [TRANSACTION_TYPE.CASH_PAID]: [['المبلغ المدفوع', values.Amount]],
    [TRANSACTION_TYPE.DEBT_TRANSFER]: [['مبلغ التحويل', values.Amount]],
    [TRANSACTION_TYPE.SETTLEMENT]: [['اتجاه الحركة', values.Direction === 'Credit' ? 'إضافة إلى رصيد المورد — دائن' : values.Direction === 'Debit' ? 'خصم من رصيد المورد — مدين' : EMPTY_VALUE], ['المبلغ', values.Amount]],
    [TRANSACTION_TYPE.GOODS_EXCHANGE]: [['اتجاه الحركة', values.Direction === 'Credit' ? 'إضافة إلى رصيد المورد — دائن' : values.Direction === 'Debit' ? 'خصم من رصيد المورد — مدين' : EMPTY_VALUE], ['المبلغ', values.Amount]],
    [TRANSACTION_TYPE.CROP_PURCHASE_LOCAL]: [
      ['صنف الفراولة', referenceName('StrawberryVariety', values[FORM_KEY.STRAWBERRY_VARIETY])],
      ['عدد العبوات', values.Units], ['الكيلو السائب', values.LooseKg], ['خصم الكيلو', values.DeductionKg], ['سعر الكيلو', values.UnitPrice]
    ],
    [TRANSACTION_TYPE.CROP_PURCHASE_CARTON]: [
      ['الشركة المستلمة', referenceName('ReceivingCompany', values[FORM_KEY.RECEIVING_COMPANY])],
      ['نوع الكرتونة', referenceName('CartonType', values[FORM_KEY.CARTON_TYPE])],
      ['عدد الكراتين', values.CartonQuantity], ['خصم الكمية', values.CartonDiscount], ['سعر الكرتونة', values.CartonPrice]
    ]
  };
  for (const [label, value] of (fieldRows[type] || [])) rows.push(reviewValue(label, value === undefined || value === '' ? EMPTY_VALUE : String(value)));
  if (values[FORM_KEY.DESCRIPTION]) rows.push(reviewValue('البيان', values[FORM_KEY.DESCRIPTION]));

  let impact = '';
  if (type === TRANSACTION_TYPE.CASH_RECEIVED || type === TRANSACTION_TYPE.CASH_PAID) {
    const received = type === TRANSACTION_TYPE.CASH_RECEIVED;
    impact = `<div class="transaction-review__impact ${received ? 'is-in' : 'is-out'}"><span class="transaction-review__impact-icon">${received ? '↓' : '↑'}</span><div><strong>${received ? 'استلام نقدية — أموال تدخل الشركة' : 'دفع نقدية — أموال تخرج من الشركة'}</strong><small>${received ? 'زيادة النقدية بالخزينة' : 'نقص النقدية بالخزينة'}</small></div></div>`;
  } else if (type === TRANSACTION_TYPE.SETTLEMENT || type === TRANSACTION_TYPE.GOODS_EXCHANGE) {
    impact = `<div class="transaction-review__impact is-neutral"><span class="transaction-review__impact-icon">⇄</span><div><strong>حركة غير نقدية</strong><small>${values.Direction === 'Credit' ? 'إضافة إلى رصيد المورد' : values.Direction === 'Debit' ? 'خصم من رصيد المورد' : 'لم يتم تحديد الاتجاه'}</small></div></div>`;
  }

  const previewRows = [];
  if (preview && preview.Valid !== false) {
    if (preview.PackageWeightKg !== undefined && preview.PackageWeightKg !== null) previewRows.push(reviewValue('وزن العبوة الافتراضي', `${preview.PackageWeightKg} كجم`));
    if (preview.NetWeightMilli !== undefined && preview.NetWeightMilli !== null) previewRows.push(reviewValue('صافي الوزن', `${formatQuantityMinor(preview.NetWeightMilli)} كجم`));
    if (preview.AmountMinor !== undefined && preview.AmountMinor !== null) previewRows.push(reviewValue('القيمة المحسوبة', formatMoneyMinor(preview.AmountMinor), true));
    if (preview.CurrentBalanceMinor !== undefined) previewRows.push(reviewValue('الرصيد الحالي', moneyCell(preview.CurrentBalanceMinor)));
    if (preview.ProjectedBalanceMinor !== undefined) previewRows.push(reviewValue('الرصيد المتوقع', moneyCell(preview.ProjectedBalanceMinor), true));
    if (preview.From?.ProjectedBalanceMinor !== undefined) previewRows.push(reviewValue('رصيد المحوّل منه بعد الحركة', moneyCell(preview.From.ProjectedBalanceMinor)));
    if (preview.To?.ProjectedBalanceMinor !== undefined) previewRows.push(reviewValue('رصيد المحوّل إليه بعد الحركة', moneyCell(preview.To.ProjectedBalanceMinor)));
  }
  const hasWarning = warning || preview?.Insufficient === true;
  const warningMarkup = hasWarning
    ? `<div class="transaction-review__warning" role="alert"><strong>تنبيه قبل التنفيذ</strong><span>الرصيد المتوقع سيصبح سالبًا. راجع البيانات، ثم أكد المتابعة إذا كنت تقصد ذلك.</span></div>`
    : '';
  return `<div class="transaction-review-backdrop" id="${TRANSACTION_REVIEW_ID}" role="presentation">
    <section class="transaction-review" role="dialog" aria-modal="true" aria-labelledby="transaction-review-title" aria-describedby="transaction-review-description">
      <header class="transaction-review__header"><div class="transaction-review__mark" aria-hidden="true">✓</div><div><span class="transaction-review__eyebrow">خطوة أخيرة قبل التسجيل</span><h3 id="transaction-review-title">مراجعة وتأكيد الحركة</h3><p id="transaction-review-description">راجع تفاصيل العملية وأثرها قبل اعتماد الحفظ النهائي.</p></div><button type="button" class="transaction-review__close" data-action="cancel-transaction-review" aria-label="العودة للتعديل" ${busy ? 'disabled' : ''}>×</button></header>
      <div class="transaction-review__body"><div class="transaction-review__section"><h4>بيانات الحركة</h4><div class="transaction-review__grid">${rows.join('')}</div></div>
      ${impact}
      ${previewRows.length ? `<div class="transaction-review__section"><h4>المعاينة والأثر المالي</h4><div class="transaction-review__grid">${previewRows.join('')}</div></div>` : ''}
      ${warningMarkup}
      <p class="transaction-review__note">لن يتم تسجيل الحركة إلا بعد الضغط على زر التأكيد أدناه.</p></div>
      <footer class="transaction-review__footer"><button type="button" class="btn btn--outline" data-action="cancel-transaction-review" ${busy ? 'disabled' : ''}>رجوع للتعديل</button><button type="button" class="btn btn--primary transaction-review__confirm" id="${TRANSACTION_REVIEW_CONFIRM_ID}" data-action="confirm-transaction-review" ${busy ? 'disabled' : ''}><span>${busy ? 'جارٍ التحقق…' : hasWarning ? 'تأكيد المتابعة والحفظ' : 'تأكيد وحفظ الحركة'}</span></button></footer>
    </section>
  </div>`;
}

export function renderFormError({ error = null } = {}) {
  if (!error) return '';
  return alert({
    tone: 'danger',
    title: 'تعذّر تسجيل الحركة',
    message: error.message || 'حدث خطأ غير متوقع.'
  });
}

// Success panel. The balance is the value the service read back; the UI only
// formats it and offers the link to the customer statement.
export function renderTransactionSuccess({ result = {}, transactionType = null } = {}) {
  const source = result.Record || (Array.isArray(result.Records) ? result.Records[0] : null) || {};
  const type = transactionType || source.TransactionType || null;
  const customer = result.Customer || {};
  const lines = [
    `<li>نوع الحركة: ${escapeHtml(TRANSACTION_TYPE_LABELS_AR[type] || type || EMPTY_VALUE)}</li>`,
    `<li>المبلغ: ${escapeHtml(formatMoneyMinor(source.AmountMinor))}</li>`,
    `<li>المورد: ${escapeHtml(customerLabel(customer))}</li>`
  ];
  if (Number.isInteger(result.NewBalanceMinor)) {
    const side = BALANCE_SIDE_TEXT[result.NewBalanceSide] || null;
    lines.push(`<li>الرصيد الحالي بعد العملية: ${escapeHtml(formatMoneyMinor(result.NewBalanceMinor))}${side ? ` (${escapeHtml(side)})` : ''}</li>`);
  }
  if (source.Direction) lines.push(`<li>اتجاه الحركة: ${escapeHtml(source.Direction === 'Credit' ? 'إضافة إلى رصيد المورد — دائن' : 'خصم من رصيد المورد — مدين')}</li>`);
  if (type === TRANSACTION_TYPE.CASH_RECEIVED) lines.push('<li>الأثر النقدي: استلام وزيادة النقدية بالخزينة</li>');
  if (type === TRANSACTION_TYPE.CASH_PAID) lines.push('<li>الأثر النقدي: دفع ونقص النقدية بالخزينة</li>');
  if (result.Counterparty) lines.push(`<li>الطرف الثاني: ${escapeHtml(customerLabel(result.Counterparty))}</li>`);
  const accountId = result.CustomerId || null;
  const accountLink = accountId && (!authService.isEnforced() || authService.isAdmin())
    ? `<a class="btn btn--primary" data-action="view-account" data-id="${escapeHtml(accountId)}" href="${escapeHtml(buildHash(customerAccountPath(accountId)))}">عرض كشف الحساب</a>`
    : '';
  return `<div class="page-section" id="${SUCCESS_REGION_ID}" role="status" data-transaction-type="${escapeHtml(type || '')}">
${card({
    title: 'تم تسجيل الحركة بنجاح',
    body: `<ul class="result-list">${lines.join('')}</ul>`,
    footer: `<div class="row">${accountLink}<button class="btn btn--outline" type="button" data-action="new-transaction">تسجيل حركة أخرى</button></div>`
  })}
</div>`;
}

// The complete form body, rendered once the services answered.
export function renderTransactionForm({
  customers = [],
  customerLoadError = null,
  transactionType = '',
  lockedCustomerId = null,
  values = null,
  fieldErrors = {},
  error = null,
  packageWeightKg = null,
  cropPreview = null,
  awaitingConfirm = false,
  referenceOptions = null,
  referencePanel = null,
  cashAcknowledged = false,
  awaitingSettlementConfirm = false,
  reviewOpen = false,
  reviewWarning = false,
  reviewBusy = false
} = {}) {
  const form = values || emptyForm({ transactionType, date: transactionFormService.currentIsoDate() });
  const activeType = form.TransactionType || transactionType;
  const errorFor = (key) => fieldErrors[key] || null;
  const locked = Boolean(lockedCustomerId);
  const customerError = customerLoadError ? 'تعذّر تحميل قائمة الموردين.' : errorFor(FORM_KEY.CUSTOMER);
  const isTransfer = activeType === TRANSACTION_TYPE.DEBT_TRANSFER;

  const headerBlocks = [
    fieldBlock({
      key: FORM_KEY.TransactionType,
      label: 'نوع الحركة',
      control: renderTransactionTypePicker(activeType),
      error: errorFor('TransactionType')
    }),
    fieldBlock({ key: FORM_KEY.DATE, control: textControl({ key: FORM_KEY.DATE, type: 'date', value: form[FORM_KEY.DATE], invalid: Boolean(errorFor(FORM_KEY.DATE)) }), error: errorFor(FORM_KEY.DATE) })
  ];

  if (isTransfer) {
    headerBlocks.push(
      fieldBlock({
        key: FORM_KEY.FROM_CUSTOMER,
        control: selectControl({ key: FORM_KEY.FROM_CUSTOMER, options: customerOptions(customers), selected: form[FORM_KEY.FROM_CUSTOMER], invalid: Boolean(errorFor(FORM_KEY.FROM_CUSTOMER)) }),
        error: errorFor(FORM_KEY.FROM_CUSTOMER)
      }),
      fieldBlock({
        key: FORM_KEY.TO_CUSTOMER,
        control: selectControl({ key: FORM_KEY.TO_CUSTOMER, options: customerOptions(customers), selected: form[FORM_KEY.TO_CUSTOMER], invalid: Boolean(errorFor(FORM_KEY.TO_CUSTOMER)) }),
        error: errorFor(FORM_KEY.TO_CUSTOMER)
      })
    );
  } else if (locked) {
    headerBlocks.push(fieldBlock({
      key: FORM_KEY.CUSTOMER,
      control: selectControl({ key: FORM_KEY.CUSTOMER, options: customerOptions(customers.filter((customer) => customer.Id === lockedCustomerId)), selected: lockedCustomerId, disabled: true, invalid: Boolean(customerError) }),
      hint: 'تم تحديد المورد مسبقًا ولا يمكن تغييره من هذه الشاشة.',
      error: customerError
    }));
  } else {
    headerBlocks.push(fieldBlock({
      key: FORM_KEY.CUSTOMER,
      control: `<input class="input" id="${FIELD_ID.CustomerSearch}" type="search" placeholder="ابحث بالكود أو الاسم" aria-label="بحث عن مورد">${
        selectControl({ key: FORM_KEY.CUSTOMER, options: customerOptions(customers), selected: form[FORM_KEY.CUSTOMER], invalid: Boolean(customerError) })
      }`,
      hint: 'البحث بالكود أو الاسم؛ المعرّف المستخدم داخليًا هو معرّف المورد.',
      error: customerError
    }));
  }

  const note = typeNote(activeType);
  const typeLabel = TRANSACTION_TYPE_LABELS_AR[activeType] || 'لم يتم تحديد نوع الحركة';
  const cashType = activeType === TRANSACTION_TYPE.CASH_RECEIVED || activeType === TRANSACTION_TYPE.CASH_PAID;
  return [
    `<div class="transaction-entry">`,
    `<div class="transaction-entry__intro"><div class="transaction-entry__intro-copy"><span class="transaction-entry__eyebrow">مركز العمليات المالية</span><h3>تسجيل حركة جديدة</h3><p>أدخل البيانات بهدوء، راجع أثر الحركة، ثم أكد التسجيل في الخطوة الأخيرة.</p></div><div class="transaction-entry__steps"><span class="is-active"><b>1</b> إدخال البيانات</span><i></i><span class="${reviewOpen ? 'is-active' : ''}"><b>2</b> المراجعة</span><i></i><span><b>3</b> التأكيد</span></div></div>`,
    `<div id="${FORM_ERROR_ID}">${renderFormError({ error })}</div>`,
    '<form id="transaction-form" class="transaction-entry__form" novalidate>',
    `<section class="transaction-entry__panel transaction-entry__panel--primary"><div class="transaction-entry__panel-heading"><div><span class="transaction-entry__step-label">الخطوة 01</span><h4>البيانات الأساسية</h4><p>حدد نوع العملية والمورد وتاريخ تسجيلها.</p></div><span class="transaction-entry__panel-icon" aria-hidden="true">01</span></div><div class="transaction-entry__basic-grid">${headerBlocks.join('\n')}</div>${note ? `<div class="transaction-entry__type-note"><span aria-hidden="true">ⓘ</span><span>${escapeHtml(note)}</span></div>` : ''}</section>`,
    `<section class="transaction-entry__panel transaction-entry__panel--details"><div class="transaction-entry__panel-heading"><div><span class="transaction-entry__step-label">الخطوة 02</span><h4>تفاصيل العملية</h4><p>${escapeHtml(typeLabel)}${cashType ? ' — تأكد من اتجاه النقدية قبل المتابعة.' : ''}</p></div><span class="transaction-entry__panel-icon" aria-hidden="true">02</span></div><div id="${DYNAMIC_FIELDS_ID}" class="transaction-entry__dynamic">${renderDynamicFields({ transactionType: activeType, values: form, fieldErrors, preview: cropPreview, awaitingConfirm, referenceOptions, referencePanel, cashAcknowledged, awaitingSettlementConfirm })}</div></section>`,
    `<div class="transaction-entry__actions"><a class="btn btn--outline" href="${escapeHtml(buildHash(customerListPath()))}">إلغاء</a><div class="transaction-entry__actions-copy"><strong>الخطوة التالية: مراجعة الحركة</strong><span>لن يتم الحفظ قبل تأكيدك النهائي.</span></div><button class="btn btn--primary transaction-entry__review-button" type="submit" id="submit-transaction" data-action="submit-transaction"><span aria-hidden="true">✓</span><span>مراجعة الحركة</span></button></div>`,
    '</form>',
    reviewOpen ? renderTransactionReviewModal({ values: form, customers, referenceOptions, preview: cropPreview, warning: reviewWarning, busy: reviewBusy, lockedCustomerId }) : '',
    '</div>'
  ].join('\n');
}

// Shell painted before the first read resolves: a visible loading state, no value.
export function transactionFormShellHtml({ lockedCustomerId = null, transactionType = '' } = {}) {
  return [
    pageHeader({
      title: 'تسجيل حركة مالية',
      description: 'اختر المورد ونوع الحركة، ثم أدخل البيانات المطلوبة. النظام هو الذي يحدد الأثر المالي والرصيد.',
      actions: `<a class="btn btn--outline" href="${escapeHtml(buildHash(customerListPath()))}">العودة إلى الموردين</a>`
    }),
    `<div class="page-section" id="${TRANSACTION_FORM_REGION_ID}" aria-busy="true"${attrs({ 'data-locked-customer': lockedCustomerId, 'data-transaction-type': transactionType || null })}>${
      loadingState({ message: 'جارٍ تحميل شاشة تسجيل الحركة…' })
    }</div>`
  ].join('\n');
}

export function transactionFormViewHtml({ lockedCustomerId = null, transactionType = '' } = {}) {
  return transactionFormShellHtml({ lockedCustomerId, transactionType });
}

// Screen controller. It reads through the services layer, keeps the entered values
// while a save is pending or rejected (a failed form is never auto-cleared), guards
// against a double submit and always leaves the loading state.
export function initTransactionFormView({
  container,
  lockedCustomerId = null,
  transactionType = '',
  navigate = null,
  services = transactionFormService,
  autoLoad = true
} = {}) {
  if (!container) return null;
  const state = {
    customers: [],
    customerLoadError: null,
    packageWeightKg: null,
    values: emptyForm({ transactionType, date: services.currentIsoDate() }),
    fieldErrors: {},
    error: null,
    busy: false,
    preview: null,
    lastResult: null,
    formClosed: false,
    // The type the dynamic fields were last rendered from. A type switch is applied
    // exactly once, no matter how many events the browser dispatches for one choice.
    renderedType: null,
    // The user has explicitly confirmed a transfer whose receiving side would go
    // negative. Any new value in the form invalidates it.
    awaitingConfirm: false,
    cashAcknowledged: false,
    awaitingSettlementConfirm: false,
    reviewOpen: false,
    reviewWarning: false,
    reviewBusy: false,
    // Phase 4B.11 — the reference catalogues and the inline add panel's own state.
    referenceOptions: null,
    referencePanel: null
  };
  const region = () => (typeof container.querySelector === 'function' ? container.querySelector(`#${TRANSACTION_FORM_REGION_ID}`) : null);
  // The transfer preview is a services-layer call. A caller may inject it (the
  // controller tests do); otherwise the approved named service export is used. Either
  // way this screen computes no balance and decides no direction itself.
  const previewFn = typeof services.previewTransfer === 'function' ? services.previewTransfer : previewTransfer;

  function fieldErrorsFrom(error) {
    const list = error && error.details && Array.isArray(error.details.errors) ? error.details.errors : [];
    const map = {};
    for (const entry of list) if (entry && entry.field) map[entry.field] = entry.message;
    if (error && error.field && !map[error.field]) map[error.field] = error.message;
    return map;
  }

  // Reads the current control values; the entered data survives a failed save.
  function readFormValues() {
    const target = region();
    if (!target || typeof target.querySelector !== 'function') return state.values;
    const read = (key, fallback) => {
      const control = target.querySelector(`#${controlIdFor(key)}`);
      return control ? control.value : fallback;
    };
    const next = { ...state.values };
    for (const key of Object.values(FORM_KEY)) next[key] = read(key, state.values[key] ?? '');
    next.TransactionType = read(FORM_KEY.TransactionType, state.values.TransactionType) || state.values.TransactionType;
    return next;
  }

  function paint() {
    const target = region();
    if (!target) return;
    target.innerHTML = renderTransactionForm({
      customers: state.customers,
      customerLoadError: state.customerLoadError,
      transactionType: state.values.TransactionType,
      lockedCustomerId,
      values: state.values,
      fieldErrors: state.fieldErrors,
      error: state.error,
      packageWeightKg: state.packageWeightKg,
      cropPreview: state.preview,
      awaitingConfirm: state.awaitingConfirm,
      referenceOptions: state.referenceOptions,
      referencePanel: state.referencePanel,
      cashAcknowledged: state.cashAcknowledged,
      awaitingSettlementConfirm: state.awaitingSettlementConfirm,
      reviewOpen: state.reviewOpen,
      reviewWarning: state.reviewWarning,
      reviewBusy: state.reviewBusy
    });
    state.renderedType = state.values.TransactionType || '';
    target.setAttribute('aria-busy', 'false');
    if (state.reviewOpen) {
      const confirmButton = target.querySelector(`#${TRANSACTION_REVIEW_CONFIRM_ID}`);
      if (confirmButton && typeof confirmButton.focus === 'function') confirmButton.focus();
    }
  }

  // Only the preview box is repainted here, so typing in a field never rebuilds the
  // form around it (the caret and the entered values stay exactly where they are).
  function paintPreview() {
    const target = region();
    if (!target || typeof target.querySelector !== 'function') return;
    const type = state.values.TransactionType;
    const boxId = isTransferType(type) ? TRANSFER_PREVIEW_ID
      : (type === TRANSACTION_TYPE.SETTLEMENT || type === TRANSACTION_TYPE.GOODS_EXCHANGE ? DIRECTION_PREVIEW_ID : CROP_PREVIEW_ID);
    const box = target.querySelector(`#${boxId}`);
    if (!box) return;
    box.innerHTML = isTransferType(type)
      ? renderTransferPreview({ preview: state.preview, awaitingConfirm: state.awaitingConfirm })
      : (type === TRANSACTION_TYPE.SETTLEMENT || type === TRANSACTION_TYPE.GOODS_EXCHANGE
        ? renderDirectionalPreview({ preview: state.preview, awaitingConfirm: state.awaitingSettlementConfirm })
        : renderCropPreview({ transactionType: type, preview: state.preview }));
  }

  async function refreshPreview() {
    const type = state.values.TransactionType;
    state.awaitingConfirm = false; // any new value invalidates a previous confirmation
    state.awaitingSettlementConfirm = false;
    if (isTransferType(type)) {
      if (transferParties(state.values).Same) {
        // Refused with a clear Arabic message and without calling any service.
        state.preview = { Valid: false, Message: SAME_CUSTOMER_MESSAGE };
        const blocked = { ...state.fieldErrors };
        blocked[FORM_KEY.TO_CUSTOMER] = SAME_CUSTOMER_MESSAGE;
        state.fieldErrors = blocked;
        paintPreview();
        return;
      }
      const cleared = { ...state.fieldErrors };
      delete cleared[FORM_KEY.TO_CUSTOMER];
      state.fieldErrors = cleared;
      try {
        state.preview = await previewFn(state.values);
      } catch (error) {
        logger.error('transfer preview failed', { message: error && error.message ? String(error.message) : null });
        state.preview = { Valid: false, Message: 'تعذّر تحميل معاينة التحويل من طبقة الخدمات.' };
      }
      paintPreview();
      return;
    }
    if (type === TRANSACTION_TYPE.SETTLEMENT || type === TRANSACTION_TYPE.GOODS_EXCHANGE) {
      try { state.preview = await settlementService.previewMovement(state.values); }
      catch (error) { state.preview = null; logger.error('directional movement preview failed', { message: error?.message || null }); }
      paintPreview();
      return;
    }
    if (!isCropPurchaseType(type)) return;
    state.preview = await services.previewCrop(state.values);
    paintPreview();
  }

  function setBusy(isBusy, busyLabel = 'جارٍ الحفظ…') {
    state.busy = isBusy;
    const target = region();
    if (!target) return;
    target.setAttribute('aria-busy', isBusy ? 'true' : 'false');
    const submitButton = typeof target.querySelector === 'function' ? target.querySelector('#submit-transaction') : null;
    if (submitButton) {
      submitButton.disabled = isBusy;
      submitButton.setAttribute('aria-disabled', isBusy ? 'true' : 'false');
      submitButton.innerHTML = isBusy
        ? `<span class="spinner" aria-hidden="true"></span><span>${escapeHtml(busyLabel)}</span>`
        : '<span aria-hidden="true">✓</span><span>مراجعة الحركة</span>';
    }
  }

  // A type switch is a pure UI act: it re-renders the fields for the new type right
  // away and decides nothing financially. Customer, Date and Description are carried
  // over; the previous type's values (including any Amount) are dropped, never moved
  // into another field. No validation runs and nothing is submitted.
  function handleTypeChange(nextType) {
    if (!nextType || nextType === state.renderedType) return false; // already rendered: idempotent
    const carried = {
      [FORM_KEY.CUSTOMER]: lockedCustomerId || state.values[FORM_KEY.CUSTOMER] || '',
      [FORM_KEY.DESCRIPTION]: state.values[FORM_KEY.DESCRIPTION] || ''
    };
    state.values = { ...emptyForm({ transactionType: nextType, date: state.values[FORM_KEY.DATE] }), ...carried };
    state.error = null;
    state.fieldErrors = {};
    state.preview = null;
    state.awaitingConfirm = false;
    state.awaitingSettlementConfirm = false;
    state.cashAcknowledged = false;
    state.reviewOpen = false;
    state.reviewWarning = false;
    paint(); // renderDynamicFields() runs here, immediately
    if (isCropPurchaseType(nextType) || isTransferType(nextType) || nextType === TRANSACTION_TYPE.SETTLEMENT || nextType === TRANSACTION_TYPE.GOODS_EXCHANGE) void refreshPreview();
    return true;
  }

  async function load() {
    try {
      const [customers, packageWeightKg, referenceOptions] = await Promise.all([
        services.listSelectableCustomers(),
        services.getDefaultPackageWeight(),
        // A reference-catalogue read failure must not block the whole screen: the
        // movement itself does not depend on it.
        (typeof services.listReferenceOptions === 'function' ? services.listReferenceOptions : listReferenceOptions)()
          .catch(() => null)
      ]);
      state.referenceOptions = referenceOptions || null;
      state.customers = Array.isArray(customers) ? customers : [];
      state.packageWeightKg = Number.isFinite(Number(packageWeightKg)) ? Number(packageWeightKg) : null;
      state.customerLoadError = null;
      if (lockedCustomerId) state.values[FORM_KEY.CUSTOMER] = lockedCustomerId;
    } catch (error) {
      logger.error('add transaction load failed', {
        code: error && error.code ? String(error.code) : null,
        message: error && error.message ? String(error.message) : null
      });
      state.customerLoadError = error;
      state.error = error;
    }
    paint();
    // A directly opened crop-purchase form gets its service-derived preview immediately.
    if ((isCropPurchaseType(state.values.TransactionType) || state.values.TransactionType === TRANSACTION_TYPE.SETTLEMENT || state.values.TransactionType === TRANSACTION_TYPE.GOODS_EXCHANGE) && !state.customerLoadError) await refreshPreview();
    return state;
  }

  function errorOutcome(error, message) {
    logger.error(message, {
      code: error && error.code ? String(error.code) : null,
      message: error && error.message ? String(error.message) : null
    });
    state.error = error;
    state.fieldErrors = fieldErrorsFrom(error);
    paint(); // every entered value is kept; nothing is cleared on failure
  }

  // Saves one reference record and refreshes the corresponding dropdown in place. The
  // form's own values are untouched and nothing financial is recalculated.
  async function saveReference() {
    const panel = state.referencePanel;
    if (!panel || panel.busy) return null;
    const input = region() && region().querySelector(`#${REFERENCE_PANEL_INPUT_ID}`);
    const name = input ? String(input.value || '').trim() : '';
    if (!name) {
      state.referencePanel = { ...panel, error: 'الاسم مطلوب ولا يمكن أن يكون فارغًا.' };
      paint();
      return null;
    }
    state.referencePanel = { ...panel, name, busy: true, error: null };
    paint();
    try {
      const created = panel.kind === 'CartonType'
        ? await (services.createCartonType || createCartonType)(name)
        : (panel.kind === 'StrawberryVariety'
          ? await (services.createStrawberryVariety || createStrawberryVariety)(name)
          : await (services.createReceivingCompany || createReceivingCompany)(name));
      // The catalogue is re-read from the services layer, so the dropdown shows the record
      // that was just created without a page reload and without any local bookkeeping.
      const readOptions = typeof services.listReferenceOptions === 'function'
        ? services.listReferenceOptions
        : listReferenceOptions;
      state.referenceOptions = (await readOptions()) || state.referenceOptions;
      // The new record is selected straight away, so the user does not have to pick it.
      const key = panel.kind === 'CartonType'
        ? FORM_KEY.CARTON_TYPE
        : (panel.kind === 'StrawberryVariety' ? FORM_KEY.STRAWBERRY_VARIETY : FORM_KEY.RECEIVING_COMPANY);
      state.values[key] = created.Id;
      state.referencePanel = null;
      state.error = null;
      paint();
      return created;
    } catch (error) {
      logger.error('reference create failed', { message: error && error.message ? String(error.message) : null });
      state.referencePanel = {
        ...panel, name, busy: false,
        error: (error && error.message) || 'تعذّر حفظ السجل المرجعي.'
      };
      paint();
      return null;
    }
  }

  async function confirmAndSave() {
    // Two independent guards: a repeated click while saving, and a form that has
    // already been closed by a successful save. Neither can create a second row.
    if (state.busy || state.formClosed || !state.reviewOpen) return null;
    const current = region();
    if (!current || (typeof current.querySelector === 'function' && !current.querySelector('#transaction-form'))) {
      return null; // the form is gone (success panel shown): there is nothing to submit
    }
    state.values = readFormValues();
    state.error = null;
    state.fieldErrors = {};
    const activeType = state.values.TransactionType;
    if ((activeType === TRANSACTION_TYPE.CASH_RECEIVED || activeType === TRANSACTION_TYPE.CASH_PAID) && !state.cashAcknowledged) {
      state.fieldErrors = { CashConfirmation: 'يجب تأكيد نوع الحركة وأثرها النقدي قبل الحفظ.' };
      paint();
      return null;
    }
    if (activeType === TRANSACTION_TYPE.SETTLEMENT || activeType === TRANSACTION_TYPE.GOODS_EXCHANGE) {
      if (state.values.Direction !== 'Credit' && state.values.Direction !== 'Debit') {
        state.fieldErrors = { [FORM_KEY.DIRECTION]: 'اختر اتجاه الحركة قبل الحفظ؛ لن يتم افتراض اتجاه تلقائي.' };
        paint();
        return null;
      }
    }
    // A transfer between the SAME party on both sides is refused before any service
    // call: no request is made, nothing is written, and the reason is shown in Arabic.
    if (isTransferType(activeType) && transferParties(state.values).Same) {
      state.fieldErrors = { [FORM_KEY.TO_CUSTOMER]: SAME_CUSTOMER_MESSAGE };
      paint();
      return null;
    }
    setBusy(true);
    try {
      // The preview is re-read from the values being submitted, so a save can never
      // ride on a stale preview. A receiving side that would go negative is accepted
      // only after the explicit confirmation below has been given.
      if (isTransferType(activeType)) {
        const fresh = await previewFn(state.values);
        state.preview = fresh || null;
        if (!fresh || fresh.Valid !== true) {
          throw {
            code: 'VALIDATION_ERROR',
            message: (fresh && fresh.Message) || 'تعذّر التحقق من بيانات التحويل.',
            field: (fresh && fresh.Field) || null
          };
        }
        if (fresh.Insufficient === true && state.reviewWarning !== true) {
          state.reviewWarning = true;
          state.reviewBusy = false;
          paint();
          return null;
        }
      } else if (activeType === TRANSACTION_TYPE.SETTLEMENT || activeType === TRANSACTION_TYPE.GOODS_EXCHANGE) {
        const fresh = await settlementService.previewMovement(state.values);
        state.preview = fresh || null;
        if (fresh && fresh.Insufficient === true && state.reviewWarning !== true) {
          state.reviewWarning = true;
          state.reviewBusy = false;
          paint();
          return null;
        }
      }
      const result = await services.submitTransactionForm(state.values);
      state.lastResult = result;
      state.formClosed = true; // this form press has been consumed
      state.reviewOpen = false;
      state.reviewWarning = false;
      const target = region();
      if (target) target.innerHTML = renderTransactionSuccess({ result, transactionType: state.values.TransactionType });
      return result;
    } catch (error) {
      state.reviewOpen = false;
      state.reviewWarning = false;
      errorOutcome(error, 'add transaction submit failed');
      return null;
    } finally {
      state.reviewBusy = false;
      setBusy(false); // loading always ends: success and failure alike
    }
  }

  async function submit() {
    if (state.busy || state.formClosed || state.reviewOpen) return null;
    const current = region();
    if (!current || (typeof current.querySelector === 'function' && !current.querySelector('#transaction-form'))) return null;
    state.values = readFormValues();
    state.error = null;
    state.fieldErrors = {};
    const activeType = state.values.TransactionType;
    if ((activeType === TRANSACTION_TYPE.CASH_RECEIVED || activeType === TRANSACTION_TYPE.CASH_PAID) && !state.cashAcknowledged) {
      state.fieldErrors = { CashConfirmation: 'يجب تأكيد نوع الحركة وأثرها النقدي قبل المراجعة.' };
      paint();
      return null;
    }
    if ((activeType === TRANSACTION_TYPE.SETTLEMENT || activeType === TRANSACTION_TYPE.GOODS_EXCHANGE) && state.values.Direction !== 'Credit' && state.values.Direction !== 'Debit') {
      state.fieldErrors = { [FORM_KEY.DIRECTION]: 'اختر اتجاه الحركة قبل المراجعة؛ لن يتم افتراض اتجاه تلقائي.' };
      paint();
      return null;
    }
    if (isTransferType(activeType) && transferParties(state.values).Same) {
      state.fieldErrors = { [FORM_KEY.TO_CUSTOMER]: SAME_CUSTOMER_MESSAGE };
      paint();
      return null;
    }
    if (!activeType) {
      state.fieldErrors = { TransactionType: 'اختر نوع الحركة أولًا.' };
      paint();
      return null;
    }
    const requiredKeys = typeof services.requiredKeys === 'function' ? services.requiredKeys(activeType) : [];
    const missingFields = {};
    for (const key of requiredKeys) {
      if (state.values[key] === null || state.values[key] === undefined || String(state.values[key]).trim() === '') {
        missingFields[key] = 'هذا الحقل مطلوب لإكمال تسجيل الحركة.';
      }
    }
    if (Object.keys(missingFields).length) {
      state.fieldErrors = missingFields;
      paint();
      return null;
    }
    setBusy(true, 'جارٍ إعداد المراجعة…');
    try {
      // Refresh every available preview immediately before showing the review screen.
      // The final confirmation repeats the authoritative preview where required.
      if (isTransferType(activeType)) {
        const fresh = await previewFn(state.values);
        state.preview = fresh || null;
        if (!fresh || fresh.Valid !== true) {
          throw { code: 'VALIDATION_ERROR', message: fresh?.Message || 'تعذّر التحقق من بيانات تحويل المديونية.', field: fresh?.Field || null };
        }
      } else if (activeType === TRANSACTION_TYPE.SETTLEMENT || activeType === TRANSACTION_TYPE.GOODS_EXCHANGE) {
        try { state.preview = await settlementService.previewMovement(state.values); }
        catch (previewError) { state.preview = null; logger.error('settlement review preview failed', { message: previewError?.message || null }); }
      } else if (isCropPurchaseType(activeType)) {
        try { state.preview = await services.previewCrop(state.values); }
        catch (previewError) { state.preview = null; logger.error('crop review preview failed', { message: previewError?.message || null }); }
      }
      state.reviewWarning = state.preview?.Insufficient === true;
      state.reviewOpen = true;
      paint();
      return { ReviewRequired: true };
    } catch (error) {
      errorOutcome(error, 'add transaction review preparation failed');
      return null;
    } finally {
      setBusy(false);
    }
  }

  container.addEventListener('change', (event) => {
    const target = event.target;
    const id = target && target.getAttribute ? target.getAttribute('id') : null;
    if (!id) return;
    if (id === 'cash-type-confirmation') {
      state.reviewOpen = false;
      state.cashAcknowledged = target.checked === true;
      const hadError = Boolean(state.fieldErrors.CashConfirmation);
      delete state.fieldErrors.CashConfirmation;
      if (hadError) paint();
      return;
    }
    if (id === FIELD_ID.TransactionType) {
      handleTypeChange(target.value);
      return;
    }
    for (const key of Object.values(FORM_KEY)) if (id === controlIdFor(key)) state.values[key] = target.value;
    if (id === controlIdFor(FORM_KEY.DIRECTION)) delete state.fieldErrors[FORM_KEY.DIRECTION];
    if (isCropPurchaseType(state.values.TransactionType) || isTransferType(state.values.TransactionType) || state.values.TransactionType === TRANSACTION_TYPE.SETTLEMENT || state.values.TransactionType === TRANSACTION_TYPE.GOODS_EXCHANGE) void refreshPreview();
  });

  container.addEventListener('input', (event) => {
    const target = event.target;
    const id = target && target.getAttribute ? target.getAttribute('id') : null;
    if (!id) return;
    if (id === FIELD_ID.TransactionType) {
      // A real <select> fires `input` and THEN `change` for one selection. The switch
      // is applied here, and the later `change` becomes a no-op because the rendered
      // type already matches. Treating this id as a plain value field is what used to
      // advance the state without re-rendering the dynamic fields.
      handleTypeChange(target.value);
      return;
    }
    if (id === FIELD_ID.CustomerSearch) {
      const term = String(target.value || '').trim().toLowerCase();
      const target2 = region();
      const select = target2 && typeof target2.querySelector === 'function' ? target2.querySelector(`#${FIELD_ID.CustomerId}`) : null;
      if (!select) return;
      const selected = select.value;
      const options = customerOptions(state.customers).filter((option) => option.value === '' || option.label.toLowerCase().includes(term));
      select.innerHTML = options.map((option) => `<option value="${escapeHtml(option.value)}"${option.value === selected ? ' selected' : ''}>${escapeHtml(option.label)}</option>`).join('');
      return;
    }
    for (const key of Object.values(FORM_KEY)) if (id === controlIdFor(key)) state.values[key] = target.value;
    if (id === controlIdFor(FORM_KEY.DIRECTION)) delete state.fieldErrors[FORM_KEY.DIRECTION];
    if (isCropPurchaseType(state.values.TransactionType) || isTransferType(state.values.TransactionType) || state.values.TransactionType === TRANSACTION_TYPE.SETTLEMENT || state.values.TransactionType === TRANSACTION_TYPE.GOODS_EXCHANGE) void refreshPreview();
  });

  container.addEventListener('submit', (event) => {
    event.preventDefault();
    void submit();
  });

  container.addEventListener('click', (event) => {
    const target = event.target;
    if (!target || !target.closest) return;
    const typeTile = target.closest('[data-action="select-transaction-type"]');
    if (typeTile) {
      const nextType = typeTile.getAttribute('data-type') || '';
      const typeSelect = region()?.querySelector(`#${FIELD_ID.TransactionType}`);
      if (typeSelect) typeSelect.value = nextType;
      handleTypeChange(nextType);
      return;
    }
    if ((target.id === TRANSACTION_REVIEW_ID || target.closest('[data-action="cancel-transaction-review"]')) && state.reviewOpen) {
      if (state.busy) return;
      state.reviewOpen = false;
      state.reviewWarning = false;
      paint();
      const submitButton = region()?.querySelector('#submit-transaction');
      if (submitButton && typeof submitButton.focus === 'function') submitButton.focus();
      return;
    }
    if (target.closest('[data-action="confirm-transaction-review"]')) {
      if (state.busy || !state.reviewOpen) return;
      state.reviewBusy = true;
      paint();
      void confirmAndSave();
      return;
    }
    if (target.closest('[data-action="confirm-transfer"]')) {
      // Explicit confirmation for a transfer that would push the receiving side
      // below zero. The values are re-validated by submit() before anything is saved.
      state.awaitingConfirm = true;
      void submit();
      return;
    }
    if (target.closest('[data-action="confirm-directional-settlement"]')) {
      state.awaitingSettlementConfirm = true;
      void submit();
      return;
    }
    if (target.closest('[data-action="dismiss-directional-confirm"]')) {
      state.awaitingSettlementConfirm = false;
      paintPreview();
      return;
    }
    if (target.closest('[data-action="dismiss-confirm"]')) {
      state.awaitingConfirm = false;
      paintPreview();
      return;
    }
    if (target.closest('[data-action="new-transaction"]')) {
      state.values = emptyForm({ transactionType: '', date: services.currentIsoDate() });
      state.error = null;
      state.fieldErrors = {};
      state.preview = null;
      state.awaitingSettlementConfirm = false;
      state.cashAcknowledged = false;
      state.reviewOpen = false;
      state.reviewWarning = false;
      state.reviewBusy = false;
      state.lastResult = null;
      state.formClosed = false;
      paint();
      return;
    }
    // Phase 4B.11 — open / save / cancel the inline reference panel. Saving writes ONE
    // reference row through the services layer: no movement, no amount, no balance.
    const addButton = target.closest('[data-action="add-receiving-company"], [data-action="add-carton-type"], [data-action="add-strawberry-variety"]');
    if (addButton) {
      state.referencePanel = {
        kind: addButton.getAttribute('data-reference-kind') || 'ReceivingCompany',
        name: '', error: null, busy: false
      };
      paint();
      const input = region() && region().querySelector(`#${REFERENCE_PANEL_INPUT_ID}`);
      if (input && typeof input.focus === 'function') input.focus();
      return;
    }
    if (target.closest('[data-action="cancel-reference"]')) {
      state.referencePanel = null;
      paint();
      return;
    }
    if (target.closest('[data-action="save-reference"]')) {
      void saveReference();
      return;
    }
    if (target.closest('[data-action="retry"]')) { void load(); return; }
    const account = target.closest('[data-action="view-account"]');
    if (account && navigate) {
      navigate(customerAccountPath(account.getAttribute('data-id') || (state.lastResult && state.lastResult.CustomerId)));
    }
  });

  container.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.reviewOpen && !state.busy) {
      state.reviewOpen = false;
      state.reviewWarning = false;
      paint();
      const submitButton = region()?.querySelector('#submit-transaction');
      if (submitButton && typeof submitButton.focus === 'function') submitButton.focus();
    }
  });

  if (autoLoad) void load();
  return {
    reload: load,
    submit,
    confirmAndSave,
    saveReference,
    state: () => ({ ...state, values: { ...state.values } }),
    regionId: TRANSACTION_FORM_REGION_ID
  };
}
