import { describe, expect, it } from 'vitest';
import { parseInvoiceExpiry, formatInvoiceExpiry } from './paymentDates';
import { getInstructionStatus } from './paymentPresentation';

describe('backend invoice expiry timezone', () => {
  it('interprets the backend Lagos local timestamp as an absolute instant independently of browser timezone', () => {
    expect(parseInvoiceExpiry('2026-10-27 11:00:00')).toBe(Date.UTC(2026, 9, 27, 10, 0, 0));
    expect(formatInvoiceExpiry('2026-10-27 11:00:00')).toBe('2026-10-27 11:00:00 (Africa/Lagos)');
  });
  it('matches the backend expiry boundary exactly', () => {
    const value = { virtualAccountExpiryDate: '2026-10-27 11:00:00' };
    const deadline = Date.UTC(2026, 9, 27, 10, 0, 0);
    expect(getInstructionStatus(value, deadline - 1)).toBe('Open');
    expect(getInstructionStatus(value, deadline)).toBe('Expired');
  });
  it.each([null, undefined, '', '2026-02-30 12:00:00', '2026-01-01 24:00:00',
    '2026-13-01 12:00:00', '2026-01-01 12:60:00', '2026-01-01T12:00:00Z', 'unparseable'])(
    'leaves unsupported or invalid expiry unavailable: %s', value => {
      expect(parseInvoiceExpiry(value)).toBeNull();
      expect(formatInvoiceExpiry(value)).toBe('Unavailable');
      expect(getInstructionStatus({ virtualAccountExpiryDate: value })).toBe('Unavailable');
    },
  );
  it('accepts a valid leap day while rejecting a normalized invalid one', () => {
    expect(parseInvoiceExpiry('2028-02-29 12:00:00')).toBe(Date.UTC(2028, 1, 29, 11));
    expect(parseInvoiceExpiry('2027-02-29 12:00:00')).toBeNull();
  });
});
