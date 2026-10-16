import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AuthScreen } from './Auth.jsx';

describe('AuthScreen', () => {
  it('shows the sign-in form by default', () => {
    render(<AuthScreen onAuthenticated={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /Sign in to SubMate/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign in/i })).toBeInTheDocument();
  });

  it('switches to registration with name and confirmation fields', async () => {
    const user = userEvent.setup();
    render(<AuthScreen onAuthenticated={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /Create an account/i }));

    expect(screen.getByRole('heading', { name: /Start tracking/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create account/i })).toBeInTheDocument();
  });

  it('flags mismatched passwords before contacting the server', async () => {
    const user = userEvent.setup();
    const onAuthenticated = vi.fn();
    render(<AuthScreen onAuthenticated={onAuthenticated} />);

    await user.click(screen.getByRole('button', { name: /Create an account/i }));
    await user.type(screen.getByLabelText(/Name/i), 'Jamie Rivera');
    await user.type(screen.getByLabelText(/Email/i), 'jamie@example.com');
    await user.type(screen.getByLabelText('Password'), 'super-secret-1');
    await user.type(screen.getByLabelText(/Confirm password/i), 'super-secret-2');
    await user.click(screen.getByRole('button', { name: /Create account/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Passwords do not match/i);
    expect(onAuthenticated).not.toHaveBeenCalled();
  });
});
