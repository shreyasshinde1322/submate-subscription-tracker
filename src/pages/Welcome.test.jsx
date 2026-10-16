import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Welcome } from './Welcome.jsx';

describe('Welcome page', () => {
  it('shows local passphrase setup on first launch', () => {
    render(<Welcome configured={false} onSubmit={() => undefined} />);
    expect(screen.getByRole('heading', { name: /Make this tracker yours/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Your name/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Passphrase', { exact: true })).toBeInTheDocument();
  });

  it('shows the unlock screen for the saved local account', () => {
    render(<Welcome configured username="Jamie" onSubmit={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /Welcome back, Jamie/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Unlock my tracker/i })).toBeInTheDocument();
  });
});
