import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import OfflineDemoNotice from './OfflineDemoNotice';

describe('offline payment notice', () => {
  it('warns explicitly against real banking/transfer use and offers no confirmation control', () => {
    render(<OfflineDemoNotice />);
    expect(screen.getByRole('note')).toHaveTextContent('OFFLINE DEMO');
    expect(screen.getByRole('note')).toHaveTextContent('Do not transfer money');
    expect(screen.getByRole('note')).toHaveTextContent('No bank transfer, debit or automatic payment confirmation');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
