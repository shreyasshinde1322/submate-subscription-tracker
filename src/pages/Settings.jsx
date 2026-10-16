import { useEffect, useState } from 'react';
import { Bell, Check, HardDrive, LockKeyhole, Wallet } from 'lucide-react';
import { Header } from '../components/Header.jsx';
import { useSubMate } from '../context/SubMateContext.jsx';
import { CURRENCIES } from '../utils/format.js';

export function Settings() {
  const { settings, saveSettings } = useSubMate();
  const [tab, setTab] = useState('Preferences');
  const [preferredCurrency, setPreferredCurrency] = useState('');
  const [budget, setBudget] = useState('');
  const [budgetCurrency, setBudgetCurrency] = useState('USD');
  const [thresholds, setThresholds] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!settings) return;
    setPreferredCurrency(settings.preferred_currency || 'USD');
    setBudgetCurrency(settings.budget_currency || settings.preferred_currency || 'USD');
    setBudget(settings.monthly_budget != null ? String(settings.monthly_budget) : '');
    setThresholds((settings.reminder_thresholds || [3, 7]).join(', '));
  }, [settings]);

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    setErrors({});
    try {
      const parsedThresholds = thresholds
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => Number(value));
      const parsedBudget = budget.trim() === '' ? null : Number(budget);
      await saveSettings({
        preferred_currency: preferredCurrency,
        monthly_budget: parsedBudget,
        budget_currency: budget.trim() === '' ? null : budgetCurrency,
        reminder_thresholds: parsedThresholds,
      });
      setFeedback({ tone: 'success', message: 'Preferences saved locally.' });
    } catch (err) {
      if (err.validation) {
        setErrors(err.validation);
        setFeedback({ tone: 'error', message: 'Check the flagged fields below.' });
      } else {
        setFeedback({ tone: 'error', message: err.message });
      }
    } finally {
      setSaving(false);
    }
  }

  if (!settings) return null;

  return (
    <>
      <Header
        eyebrow="YOUR SPACE, YOUR WAY"
        title="Settings"
        subtitle="A few little details to make SubMate feel like yours."
        page="Settings"
      />

      <section className="panel settings-panel">
        <div className="settings-tabs">
          <button className={tab === 'Preferences' ? 'active' : ''} onClick={() => setTab('Preferences')}>Preferences</button>
          <button className={tab === 'Notifications' ? 'active' : ''} onClick={() => setTab('Notifications')}>Notifications</button>
          <button className={tab === 'Account' ? 'active' : ''} onClick={() => setTab('Account')}>Account</button>
        </div>

        <div className="settings-content">
          {tab === 'Preferences' && (
            <form onSubmit={handleSave}>
              <div className="settings-heading">
                <div className="eyebrow">PREFERENCES</div>
                <h2>Make it yours</h2>
                <p>Choose how you’d like your subscriptions to show up.</p>
              </div>

              <div className="setting-row">
                <div><b>Preferred currency</b><span>Used for your spending summaries</span></div>
                <select className="settings-select" value={preferredCurrency} onChange={(event) => setPreferredCurrency(event.target.value)} aria-label="Preferred currency">
                  {CURRENCIES.map((code) => <option key={code} value={code}>{code}</option>)}
                </select>
              </div>

              <div className="setting-row">
                <div><b>Monthly budget</b><span>Leave empty to disable the budget</span></div>
                <div className="settings-inline">
                  <input
                    className="settings-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={budget}
                    onChange={(event) => setBudget(event.target.value)}
                    placeholder="No budget"
                    aria-label="Monthly budget"
                  />
                  <select className="settings-select" value={budgetCurrency} onChange={(event) => setBudgetCurrency(event.target.value)} aria-label="Budget currency">
                    {CURRENCIES.map((code) => <option key={code} value={code}>{code}</option>)}
                  </select>
                </div>
              </div>
              {errors.monthly_budget && <div className="field-error">{errors.monthly_budget}</div>}

              <div className="setting-row">
                <div><b>Reminder thresholds</b><span>Days before a renewal you want a nudge (e.g. 3, 7)</span></div>
                <input
                  className="settings-input settings-thresholds"
                  value={thresholds}
                  onChange={(event) => setThresholds(event.target.value)}
                  placeholder="3, 7"
                  aria-label="Reminder thresholds in days"
                />
              </div>
              {errors.reminder_thresholds && <div className="field-error">{errors.reminder_thresholds}</div>}
              {errors.preferred_currency && <div className="field-error">{errors.preferred_currency}</div>}

              <div className="settings-actions">
                <button className="primary-button" type="submit" disabled={saving}>
                  {saving ? 'Saving…' : (<><SaveIcon /> Save preferences</>)}
                </button>
              </div>
            </form>
          )}

          {tab === 'Notifications' && (
            <div className="settings-heading">
              <div className="eyebrow">NOTIFICATIONS</div>
              <h2>Reminders stay in the app.</h2>
              <p>SubMate is a local, single-user app. Renewal reminders appear here, in the bell, and on the Renewals screen.</p>
              <div className="setting-note"><Bell size={15} /> No push notifications, email or SMS are sent.</div>
            </div>
          )}

          {tab === 'Account' && (
            <div className="settings-heading">
              <div className="eyebrow">ACCOUNT</div>
              <h2>You run this app locally.</h2>
              <p>There is no SubMate account and no third-party sync. Your data lives in the PostgreSQL database you configured.</p>
              <div className="setting-note"><HardDrive size={15} /> Single user · PostgreSQL database · no remote access</div>
              <div className="setting-note"><LockKeyhole size={15} /> Nothing is shared with anyone else</div>
              <div className="setting-note"><Wallet size={15} /> Import/export available via CSV on the Subscriptions screen</div>
            </div>
          )}

          {feedback && (
            <div className={`inline-alert ${feedback.tone === 'error' ? 'inline-error' : 'inline-success'}`} role="status">
              {feedback.message}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function SaveIcon() {
  return <Check size={16} />;
}