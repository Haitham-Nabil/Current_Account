import test from 'node:test';
import assert from 'node:assert/strict';
import { sortReportCustomers } from '../ui/views/reportCustomerSort.js';

test('report customer selector options are sorted in Arabic alphabetical order without mutating source', () => {
  const source = [
    { value: '3', label: 'محمد' },
    { value: '1', label: 'أحمد' },
    { value: '2', label: 'إبراهيم' },
    { value: '4', label: 'خالد' }
  ];
  const sorted = sortReportCustomers(source);
  assert.deepEqual(sorted.map((item) => item.label), ['إبراهيم', 'أحمد', 'خالد', 'محمد']);
  assert.deepEqual(source.map((item) => item.label), ['محمد', 'أحمد', 'إبراهيم', 'خالد']);
});
