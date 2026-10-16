import { useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  User,
} from 'lucide-react';
import { BrandMark } from '../components/ui.jsx';
import { api } from '../api/client.js';

const EMPTY = { name: '', email: '', password: '', confirmPassword: '' };

export function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [fields, setFields] = useState(EMPTY);
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const registering = mode === 'register';

  function update(key) {
    return (event) => setFields((current) => ({ ...current, [key]: event.target.value }));
  }

  function switchMode(next) {
    setMode(next);
    setLocalError('');
    setFieldErrors({});
    setFields(EMPTY);
  }

  async function submit(event) {
    event.preventDefault();
    setLocalError('');
    setFieldErrors({});

    if (registering && fields.password !== fields.confirmPassword) {
      setFieldErrors({ confirmPassword: 'Passwords do not match.' });
      setLocalError('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      const result = registering
        ? await api.auth.register({
            name: fields.name.trim(),
            email: fields.email.trim(),
            password: fields.password,
            confirmPassword: fields.confirmPassword,
          })
        : await api.auth.login({ email: fields.email.trim(), password: fields.password });
      onAuthenticated(result.user);
    } catch (error) {
      if (error.validation) {
        setFieldErrors(error.validation);
        setLocalError(error.message);
      } else if (error.code === 'EMAIL_TAKEN') {
        setFieldErrors({ email: error.message });
        setLocalError(error.message);
      } else {
        setLocalError(error.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="auth-brand"><BrandMark /><div><b>submate</b><small>spend with intention</small></div></div>
        <div className="auth-copy">
          <div className="auth-kicker"><span /> A CALMER WAY TO KEEP TRACK</div>
          <h1>Know what’s<br />coming. Feel good<br />about what stays.</h1>
          <p>Your subscriptions, renewals, and monthly spend — all in one thoughtful place.</p>
          <div className="auth-art" aria-hidden="true">
            <div className="auth-orbit auth-orbit-a" /><div className="auth-orbit auth-orbit-b" /><div className="auth-orbit auth-orbit-c" />
            <div className="auth-art-core"><BrandMark /></div>
            <div className="auth-float auth-float-one"><span className="mini-spark">✳</span><div><b>Looking balanced</b><small>Your month at a glance</small></div></div>
            <div className="auth-float auth-float-two"><span className="mini-calendar"><CalendarDays size={15} /></span><div><b>Next up</b><small>Your renewals, clearly</small></div></div>
            <span className="auth-star star-one">✦</span><span className="auth-star star-two">✧</span>
          </div>
        </div>
        <div className="auth-story-footer"><span>Small details. A little more peace of mind.</span><span>© 2026 SubMate</span></div>
      </section>

      <section className="auth-form-side">
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand"><BrandMark /><b>submate</b></div>
          <div className="auth-welcome">
            <div className="eyebrow">{registering ? 'CREATE YOUR ACCOUNT' : 'WELCOME BACK'}</div>
            <h2>{registering ? 'Start tracking in minutes.' : 'Sign in to SubMate.'}</h2>
            <p>
              {registering
                ? 'Create an account to keep your subscriptions and renewals in one place.'
                : 'Enter your email and password to open your dashboard.'}
            </p>
          </div>

          <form className="login-form" onSubmit={submit} noValidate>
            {registering && (
              <label>
                Name
                <div className="auth-input">
                  <User size={16} />
                  <input
                    value={fields.name}
                    onChange={update('name')}
                    placeholder="e.g. Jamie Rivera"
                    minLength={2}
                    maxLength={120}
                    required
                    autoComplete="name"
                  />
                </div>
                {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
              </label>
            )}

            <label>
              Email
              <div className="auth-input">
                <Mail size={16} />
                <input
                  type="email"
                  value={fields.email}
                  onChange={update('email')}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
              {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
            </label>

            <label>
              Password
              <div className="auth-input">
                <LockKeyhole size={16} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={fields.password}
                  onChange={update('password')}
                  placeholder={registering ? 'At least 8 characters' : 'Enter your password'}
                  minLength={8}
                  maxLength={200}
                  required
                  autoComplete={registering ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
            </label>

            {registering && (
              <label>
                Confirm password
                <div className="auth-input">
                  <ShieldCheck size={16} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={fields.confirmPassword}
                    onChange={update('confirmPassword')}
                    placeholder="Enter it again"
                    minLength={8}
                    maxLength={200}
                    required
                    autoComplete="new-password"
                  />
                </div>
                {fieldErrors.confirmPassword && (
                  <span className="field-error">{fieldErrors.confirmPassword}</span>
                )}
              </label>
            )}

            {localError && <div className="inline-alert inline-error" role="alert">{localError}</div>}

            <button className="auth-submit" type="submit" disabled={busy}>
              {busy ? 'Please wait…' : registering ? 'Create account' : 'Sign in'}
              {!busy && <ArrowRight size={16} />}
            </button>
          </form>

          <p className="auth-signup">
            {registering ? 'Already have an account?' : 'New to SubMate?'}{' '}
            <button
              type="button"
              className="auth-switch"
              onClick={() => switchMode(registering ? 'login' : 'register')}
            >
              {registering ? 'Sign in' : 'Create an account'}
            </button>
          </p>
          <div className="auth-disclaimer"><LockKeyhole size={13} /> Secured with an encrypted, HttpOnly session cookie.</div>
        </div>
        <div className="auth-mobile-footer">Made for a little more peace of mind.</div>
      </section>
    </main>
  );
}
