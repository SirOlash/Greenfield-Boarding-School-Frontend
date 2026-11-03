// Mock invoice expiry is yyyy-MM-dd HH:mm:ss in Africa/Lagos, as parsed by
// backend PaymentSchedule. Never interpret this unzoned text in the browser zone.
export function parseInvoiceExpiry(value: string | null | undefined): number | null {
  if (!value || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) return null;
  const localIso = value.replace(' ', 'T');
  const instant = Date.parse(localIso + '+01:00');
  if (!Number.isFinite(instant)) return null;
  // Date.parse may normalize invalid calendar dates or 24:00; backend rejects them.
  const roundTrip = new Date(instant + 60 * 60 * 1000).toISOString().slice(0, 19);
  return roundTrip === localIso ? instant : null;
}

export function formatInvoiceExpiry(value: string | null | undefined): string {
  return parseInvoiceExpiry(value) == null ? 'Unavailable' : value + ' (Africa/Lagos)';
}
