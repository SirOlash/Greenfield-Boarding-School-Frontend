import { AxiosError } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import api from './axiosConfig';

const originalAdapter = api.defaults.adapter;
afterEach(() => {
  api.defaults.adapter = originalAdapter;
  localStorage.clear();
  window.history.replaceState({}, '', '/');
});
describe('JWT interceptor preservation', () => {
  it('attaches the stored bearer token and never sends a token after logout', async () => {
    localStorage.setItem('greenfield_token', 'synthetic-session-token');
    const seen: (string | undefined)[] = [];
    api.defaults.adapter = async config => {
      seen.push(config.headers.get('Authorization')?.toString());
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
    };
    await api.get('/students', { params: { parentEmail: 'parent@example.invalid' } });
    localStorage.removeItem('greenfield_token');
    await api.get('/branches');
    expect(seen).toEqual(['Bearer synthetic-session-token', undefined]);
  });
  it('clears cached identity and notifies auth on 401 without reloading an invalid login', async () => {
    window.history.replaceState({}, '', '/login');
    localStorage.setItem('greenfield_token', 'synthetic-session-token');
    localStorage.setItem('greenfield_user', '{}');
    const unauthorized = vi.fn();
    window.addEventListener('greenfield:unauthorized', unauthorized);
    api.defaults.adapter = async config => {
      throw new AxiosError('safe test failure', undefined, config, undefined,
        { data: {}, status: 401, statusText: 'Unauthorized', headers: {}, config });
    };
    try {
      await expect(api.post('/auth/login', {})).rejects.toBeInstanceOf(AxiosError);
      expect(localStorage.getItem('greenfield_token')).toBeNull();
      expect(localStorage.getItem('greenfield_user')).toBeNull();
      expect(unauthorized).toHaveBeenCalledOnce();
      expect(window.location.pathname).toBe('/login');
    } finally {
      window.removeEventListener('greenfield:unauthorized', unauthorized);
    }
  });
});
