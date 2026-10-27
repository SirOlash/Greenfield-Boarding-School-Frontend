import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import { getApiErrorMessage, getHttpStatus } from './apiErrors';

function error(status: number, message = 'private SQL statement and payment identifier') {
  return new AxiosError('private transport message', undefined, undefined, undefined, {
    data: { code: 'ERROR', message, status }, status, statusText: '', headers: {},
    config: { headers: new AxiosHeaders() },
  });
}
describe('consistent safe HTTP errors', () => {
  it('provides useful validation feedback for expected 400 failures', () => {
    expect(getApiErrorMessage(error(400, 'Frequency is required'))).toBe('Frequency is required');
  });
  it.each([[401, 'sign in'], [403, 'permission'], [404, 'not be found'], [409, 'conflicts'], [500, 'try again later']])(
    'handles %s without leaking raw messages', (status, guidance) => {
      expect(getHttpStatus(error(status))).toBe(status);
      expect(getApiErrorMessage(error(status))).toContain(guidance);
      expect(getApiErrorMessage(error(status))).not.toMatch(/SQL|identifier|transport/);
    },
  );
  it('keeps unexpected failures generic even when the server sends plain text', () => {
    expect(getApiErrorMessage(error(503))).toBe(getApiErrorMessage(error(500)));
    expect(getApiErrorMessage(new Error('secret runtime failure'))).not.toContain('secret');
  });
});
