import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

function Session() {
  const { user, isLoading, login, logout } = useAuth();
  return <div>
    <p>{isLoading ? 'Loading session' : user ? user.firstName : 'Signed out'}</p>
    <button onClick={() => login({ token: 'synthetic-session-token', role: 'PARENT',
      email: 'parent@example.invalid', firstName: 'Demo Parent', branchId: null })}>Sign in</button>
    <button onClick={logout}>Sign out</button>
  </div>;
}
afterEach(() => { cleanup(); localStorage.clear(); });
describe('authentication state', () => {
  it('preserves a valid cached parent session including nullable branchId', async () => {
    localStorage.setItem('greenfield_token', 'synthetic-session-token');
    localStorage.setItem('greenfield_user', JSON.stringify({ role: 'PARENT', firstName: 'Demo Parent', branchId: null }));
    render(<AuthProvider><Session /></AuthProvider>);
    expect(await screen.findByText('Demo Parent')).toBeInTheDocument();
  });
  it.each(['{invalid', '{"role":["PARENT"],"firstName":"Demo Parent"}', '{"role":"OTHER","firstName":"Demo Parent"}'])(
    'clears malformed cached identities without treating them as authenticated', async value => {
      localStorage.setItem('greenfield_token', 'synthetic-session-token');
      localStorage.setItem('greenfield_user', value);
      render(<AuthProvider><Session /></AuthProvider>);
      expect(await screen.findByText('Signed out')).toBeInTheDocument();
      expect(localStorage.getItem('greenfield_token')).toBeNull();
    },
  );
  it('clears rendered identity after the interceptor reports an expired session', async () => {
    render(<AuthProvider><Session /></AuthProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByText('Demo Parent')).toBeInTheDocument();
    fireEvent(window, new Event('greenfield:unauthorized'));
    await waitFor(() => expect(screen.getByText('Signed out')).toBeInTheDocument());
    expect(localStorage.getItem('greenfield_token')).toBeNull();
  });
  it('retains explicit login/logout behavior', async () => {
    render(<AuthProvider><Session /></AuthProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(localStorage.getItem('greenfield_token')).toBe('synthetic-session-token');
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(screen.getByText('Signed out')).toBeInTheDocument();
    expect(localStorage.getItem('greenfield_token')).toBeNull();
  });
});
