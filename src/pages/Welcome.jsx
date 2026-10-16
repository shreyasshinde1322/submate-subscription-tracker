import { useState } from 'react';
import { ArrowRight, CalendarDays, Eye, EyeOff, HardDrive, LockKeyhole, ShieldCheck } from 'lucide-react';
import { BrandMark } from '../components/ui.jsx';

export function Welcome({ configured, username, error, busy, onSubmit }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const settingUp = !configured;

  async function submit(event) {
    event.preventDefault();
    setLocalError('');
    if (settingUp && password !== confirm) {
      setLocalError('Those passphrases don’t match yet.');
      return;
    }
    await onSubmit({ username: name.trim(), password });
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
            <div className="eyebrow">{settingUp ? 'YOUR PRIVATE WORKSPACE' : 'WELCOME BACK'}</div>
            <h2>{settingUp ? 'Make this tracker yours.' : `Welcome back${username ? `, ${username}` : ''}.`}</h2>
            <p>{settingUp ? 'Create a local passphrase to protect this tracker.' : 'Unlock your local subscription tracker.'}</p>
          </div>
          <form className="login-form" onSubmit={submit}>
            <div className="local-note"><HardDrive size={17} /><p><b>Stored in your PostgreSQL database.</b> Your subscriptions are saved in the database you configured. No third-party account is used.</p></div>
            {settingUp && (
              <label>Your name<div className="auth-input"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Jamie" minLength={2} maxLength={60} required autoComplete="name" /></div></label>
            )}
            <label>Passphrase<div className="auth-input"><LockKeyhole size={16} /><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={settingUp ? 'At least 10 characters' : 'Enter your passphrase'} minLength={10} maxLength={200} required autoComplete={settingUp ? 'new-password' : 'current-password'} /><button type="button" aria-label={showPassword ? 'Hide passphrase' : 'Show passphrase'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
            {settingUp && <label>Confirm passphrase<div className="auth-input"><ShieldCheck size={16} /><input type={showPassword ? 'text' : 'password'} value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Enter it again" minLength={10} maxLength={200} required autoComplete="new-password" /></div></label>}
            {(localError || error) && <div className="inline-alert inline-error" role="alert">{localError || error}</div>}
            <button className="auth-submit" type="submit" disabled={busy || Boolean(error && !configured)}>{busy ? 'Please wait…' : settingUp ? 'Create local passphrase' : 'Unlock my tracker'} <ArrowRight size={16} /></button>
          </form>
          <p className="auth-signup">{settingUp ? 'This passphrase is stored as a secure hash on this computer.' : 'Forgot it? Your local data has no cloud recovery option.'}</p>
          <div className="auth-disclaimer"><LockKeyhole size={13} /> Local access protection for this computer.</div>
        </div>
        <div className="auth-mobile-footer">Made for a little more peace of mind.</div>
      </section>
    </main>
  );
}
