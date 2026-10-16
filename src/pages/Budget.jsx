import { useState } from 'react';
import { Check, SlidersHorizontal } from 'lucide-react';
import { Header } from '../components/Header.jsx';
import { CategoryList } from '../components/ui.jsx';
import { useSubMate } from '../context/SubMateContext.jsx';
import { CURRENCIES, formatMoney } from '../utils/format.js';

const CYCLE_COMPARISON = [
  { cycle: 'Weekly', monthly_equivalent: '$433.33', annual_equivalent: '$5,200.00', note: '52 payments a year' },
  { cycle: 'Monthly', monthly_equivalent: '$100.00', annual_equivalent: '$1,200.00', note: '12 payments a year' },
  { cycle: 'Quarterly', monthly_equivalent: '$33.33', annual_equivalent: '$400.00', note: '4 payments a year' },
  { cycle: 'Yearly', monthly_equivalent: '$8.33', annual_equivalent: '$100.00', note: '1 payment a year' },
];

export function Budget() {
  const { dashboard, settings, saveSettings, notify } = useSubMate();
  const dash = dashboard || {};
  const [limitInput, setLimitInput] = useState(
    settings && settings.monthly_budget != null ? String(settings.monthly_budget) : '',
  );
  const [budgetCurrency, setBudgetCurrency] = useState(
    settings ? settings.budget_currency || settings.preferred_currency : 'USD',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const budget = dash.budget || {};
  const preferred = settings ? settings.preferred_currency : 'USD';

  const categoryGroups = dash.categories_by_currency || [];
  const categoryGroup = categoryGroups.find((group) => group.currency === budget.currency) || categoryGroups[0] || null;

  async function handleSave(clear = false) {
    setSaving(true);
    setError(null);
    let nextLimit;
    if (clear) {
      nextLimit = null;
      setLimitInput('');
    } else {
      nextLimit = Number(limitInput);
      if (!Number.isFinite(nextLimit) || nextLimit < 0) {
        setError('Enter a valid non-negative budget amount.');
        setSaving(false);
        return;
      }
    }
    if (nextLimit === 0) nextLimit = null;
    try {
      await saveSettings({
        preferred_currency: settings.preferred_currency,
        monthly_budget: nextLimit,
        budget_currency: clear ? null : budgetCurrency,
        reminder_thresholds: settings.reminder_thresholds,
      });
      if (clear) setLimitInput('');
      notify(clear ? 'Budget removed.' : 'Budget saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const configured = budget.configured;

  return (
    <>
      <Header
        eyebrow="A LITTLE ROOM TO BREATHE"
        title="Monthly budget"
        subtitle="Choose a number that feels comfortable."
        page="Budget"
      />

      {error && <div className="inline-alert inline-error">{error}</div>}

      <section className="budget-layout">
        <article className="panel budget-main">
          <div className="eyebrow">YOUR MONTHLY LIMIT</div>
          <h2>
            {configured ? `${formatMoney(budget.limit, budget.currency)}` : '—'}
            <span> / month{budget.currency ? ` in ${budget.currency}` : ''}</span>
          </h2>

          {configured ? (
            <>
              <div className="budget-meter">
                <i style={{ width: `${Math.min(100, budget.used_percent || 0)}%` }} />
              </div>
              <div className="budget-labels">
                <span>{formatMoney(budget.monthly_spend, budget.currency)} spent</span>
                <b>{budget.remaining >= 0 ? `${formatMoney(budget.remaining, budget.currency)} left` : 'Over budget'}</b>
              </div>
              <div className={`budget-note ${budget.over_budget ? 'budget-note-over' : ''}`}>
                <div><Check size={17} /></div>
                <p>
                  {budget.over_budget
                    ? `You’re over your monthly limit by ${formatMoney(Math.abs(budget.remaining), budget.currency)}. Time to review.`
                    : (
                      <>
                        You’re within your monthly limit. You’ve used <b>{budget.used_percent ?? 0}%</b> of your budget.
                      </>
                    )}
                </p>
              </div>
            </>
          ) : (
            <div className="budget-note">
              <div><Check size={17} /></div>
              <p>No budget set yet. Set one below and we’ll track how you’re pacing against it.</p>
            </div>
          )}

          <div className="budget-form">
            <div className="form-two">
              <label>
                Budget limit
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={limitInput}
                  onChange={(event) => setLimitInput(event.target.value)}
                  placeholder={configured ? String(budget.limit) : '0.00'}
                  inputMode="decimal"
                  aria-label="Monthly budget limit"
                />
              </label>
              <label>
                Budget currency
                <select
                  className="select-input"
                  value={budgetCurrency}
                  onChange={(event) => setBudgetCurrency(event.target.value)}
                  aria-label="Budget currency"
                >
                  {CURRENCIES.map((code) => <option key={code} value={code}>{code}</option>)}
                </select>
              </label>
            </div>
            <div className="budget-form-actions">
              <button className="primary-button" onClick={() => handleSave(false)} disabled={saving}>
                <SlidersHorizontal size={16} /> {configured ? 'Update budget' : 'Set budget'}
              </button>
              {configured && (
                <button className="secondary-button" onClick={() => handleSave(true)} disabled={saving}>
                  Remove budget
                </button>
              )}
            </div>
            <p className="budget-hint">Budget comparisons only use matching currencies — other currencies are shown separately and never mixed in.</p>
          </div>
        </article>

        <article className="budget-side">
          <div className="eyebrow">YOUR PACE</div>
          <h2>{configured ? 'Looking good.' : 'A little headroom works wonders.'}</h2>
          <p>
            {configured
              ? 'At your current pace, your subscriptions sit against the limit you set.'
              : 'Set a comfortable limit and let SubMate keep you honest without being preachy.'}
          </p>
          <div className="budget-side-stat">
            <span>Monthly recurring spend</span>
            <b>{formatMoney(budget.monthly_spend, budget.currency || preferred)}</b>
          </div>
          <div className="budget-side-stat">
            <span>Budget remaining</span>
            <b className={!configured || budget.remaining < 0 ? 'budget-neutral' : 'positive'}>
              {configured ? formatMoney(budget.remaining, budget.currency) : 'No budget set'}
            </b>
          </div>
          <div className="budget-side-stat">
            <span>Annual budget</span>
            <b>{configured ? formatMoney(Number(budget.limit) * 12, budget.currency) : '—'}</b>
          </div>
        </article>
      </section>

      <section className="panel budget-breakdown">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">BUDGET BREAKDOWN</div>
            <h2>Where it’s going</h2>
          </div>
          <span className="soft-count">{categoryGroup ? categoryGroup.currency : preferred}</span>
        </div>
        <CategoryList rows={categoryGroup ? categoryGroup.categories : []} currencyOverride={categoryGroup ? categoryGroup.currency : preferred} />
      </section>

      <section className="panel budget-breakdown">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">BILLING-CYCLE COMPARISON</div>
            <h2>How billing cycles compare</h2>
          </div>
        </div>
        <p className="budget-illustrative">Illustrative — the monthly equivalent of a <b>$100 per renewal</b> plan, depending on its billing cycle. Actual prices depend on each provider.</p>
        <div className="cycle-table">
          <div className="cycle-header">
            <span>Billing cycle</span><span>Monthly equivalent</span><span>Annual equivalent</span>
          </div>
          {CYCLE_COMPARISON.map((row) => (
            <div className="cycle-row" key={row.cycle}>
              <span><b>{row.cycle}</b><small>{row.note}</small></span>
              <span>{row.monthly_equivalent}</span>
              <span>{row.annual_equivalent}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}