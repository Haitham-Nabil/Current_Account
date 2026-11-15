// Consistent Arabic alphabetical ordering for customer selectors in reports.
const ARABIC_COLLATOR = new Intl.Collator('ar', { sensitivity: 'base', numeric: true, ignorePunctuation: true });
export function sortReportCustomers(customers = []) {
  return [...customers].sort((a, b) => ARABIC_COLLATOR.compare(String(a?.label ?? a?.Name ?? ''), String(b?.label ?? b?.Name ?? '')) || ARABIC_COLLATOR.compare(String(a?.Code ?? ''), String(b?.Code ?? '')));
}
