import { Activity, ArrowRight, CalendarDays, CircleDollarSign, CreditCard } from 'lucide-react';
import { Header } from '../components/Header.jsx';
import {
  CategoryList,
  EmptyState,
  Metric,
  RenewalRow,
  SimpleBarChart,
} from '../components/ui.jsx';
import { useSubMate } from '../context/SubMateContext.jsx';
import { formatDays, formatMoney, longDateLabel, shortCategory } from '../utils/format.js';

export function Overview({ openAdd, goTo, openDetails }) {
  const { dashboard, settings, subscriptions } = useSubMate();
  const preferred = settings ? settings.preferred_currency : 'USD';
  const dash = dashboard || {};
  const empty = subscriptions.length === 0;

  const monthlyRows = dash.monthly_by_currency || [];
  const preferredMonthly = monthlyRows.find((row) => row.currency === preferred);
  const preferredAnnual = (dash.annual_by_currency || []).find((row) => row.currency === preferred);
  const otherCurrencies = monthlyRows.filter((row) => row.currency !== preferred);

  const categoryGroups = dash.categories_by_currency || [];
  const categoryGroup =
    categoryGroups.find((group) => group.currency === preferred) || categoryGroups[0] || null;

  const chartData = categoryGroup
    ? categoryGroup.categories.slice(0, 6).map((row) => ({
        label: shortCategory(row.category),
        value: row.amount,
      }))
    : [];

  const upcoming = dash.upcoming && dash.upcoming.all ? dash.upcoming.all : [];
  const within7 = dash.upcoming && dash.upcoming.within7 ? dash.upcoming.within7 : [];
  const reminders = dash.upcoming && dash.upcoming.reminders ? dash.upcoming.reminders : [];

  const budget = dash.budget || {};
  const budgetConfigured = budget.configured;

  return (
    <>
      <Header
        eyebrow={longDateLabel()}
        title="Your money, in rhythm."
        subtitle="A clear view of the little things that add up."
        onAdd={openAdd}
        page="Overview"
        onNotifications={() => goTo('Renewals')}
        remindersCount={reminders.length}
      />

      {empty ? (
        <EmptyState
          title="Your tracker is wide open."
          message="Add your first subscription and SubMate will start tracking renewals, spend and budgets from the very first record."
          actionLabel="Add subscription"
          onAction={openAdd}
        />
      ) : (
        <>
          <div className="metric-grid">
            <Metric
              label="Monthly spend"
              value={preferredMonthly ? formatMoney(preferredMonthly.amount, preferred) : formatMoney(0, preferred)}
              meta={otherCurrencies.length ? `Also tracked: ${otherCurrencies.map((row) => formatMoney(row.amount, row.currency)).join(', ')}` : `Across ${dash.monthly_by_currency.length || 1} ${dash.monthly_by_currency.length === 1 ? 'currency' : 'currencies'}`}
              icon={CircleDollarSign}
              tone="metric-primary"
              onClick={() => goTo('Analytics')}
            />
            <Metric
              label="Active subscriptions"
              value={String(dash.active_count ?? 0).padStart(2, '0')}
              meta={`Across ${new Set(subscriptions.filter((s) => s.status === 'active').map((s) => s.category)).size} categories`}
              icon={CreditCard}
              onClick={() => goTo('Subscriptions')}
            />
            <Metric
              label="Annual estimate"
              value={preferredAnnual ? formatMoney(preferredAnnual.amount, preferred) : formatMoney(0, preferred)}
              meta="At your current pace"
              icon={Activity}
              onClick={() => goTo('Analytics')}
            />
            <Metric
              label="Renewing this week"
              value={String(within7.length).padStart(2, '0')}
              meta={within7.some((item) => item.dueToday) ? 'Next one is today' : within7.length ? `Next: ${formatDays(Math.min(...within7.map((item) => item.daysUntil)))}` : 'Nothing due'}
              icon={CalendarDays}
              tone={within7.length ? 'metric-alert' : ''}
              onClick={() => goTo('Renewals')}
            />
          </div>

          <section className="content-grid">
            <article className="panel renewals-panel">
              <div className="panel-heading">
                <div>
                  <div className="eyebrow">COMING UP</div>
                  <h2>Next renewals <span className="soft-count">{String(within7.length).padStart(2, '0')}</span></h2>
                  <p>Payments on your horizon</p>
                </div>
                <button className="text-button" onClick={() => goTo('Renewals')}>
                  View calendar <ArrowRight size={15} />
                </button>
              </div>
              <div className="renewal-list">
                {upcoming.length === 0 && <p className="muted-inline">Nothing scheduled — you’re all clear.</p>}
                {upcoming.slice(0, 5).map((item) => (
                  <RenewalRow key={item.id} item={item} onClick={() => openDetails(item)} />
                ))}
              </div>
              <button className="panel-footer-button" onClick={() => goTo('Subscriptions')}>
                See all subscriptions <ArrowRight size={15} />
              </button>
            </article>

            <article className="panel spend-panel">
              <div className="panel-heading">
                <div>
                  <div className="eyebrow">THE BIG PICTURE</div>
                  <h2>Monthly spend by category</h2>
                  <p>Recurring spend, mapped by where it goes</p>
                </div>
                <button className="text-button" onClick={() => goTo('Analytics')}>View analytics <ArrowRight size={15} /></button>
              </div>
              <SimpleBarChart data={chartData} currency={categoryGroup ? categoryGroup.currency : preferred} />
              <div className="chart-summary">
                <div>
                  <span>Monthly total</span>
                  <b>{preferredMonthly ? formatMoney(preferredMonthly.amount, preferred) : formatMoney(0, preferred)}</b>
                </div>
                <div className="summary-divider" />
                <div>
                  <span>Active services</span>
                  <b>{String(dash.active_count ?? 0).padStart(2, '0')} subscriptions</b>
                </div>
              </div>
            </article>
          </section>

          <section className="bottom-grid">
            <article className="panel categories-panel">
              <div className="panel-heading">
                <div>
                  <div className="eyebrow">WHERE IT GOES</div>
                  <h2>Spend by category</h2>
                </div>
              </div>
              <CategoryList rows={categoryGroup ? categoryGroup.categories : []} currencyOverride={categoryGroup ? categoryGroup.currency : preferred} />
              <button className="subtle-link" onClick={() => goTo('Analytics')}>
                Explore spending insights <ArrowRight size={15} />
              </button>
            </article>

            <article className="budget-feature">
              <div className="feature-deco">
                <div className="orbit orbit-one" />
                <div className="orbit orbit-two" />
                <div className="orbit-dot" />
              </div>
              <div className="eyebrow">A GENTLE GUARDRAIL</div>
              <h2>
                {budgetConfigured ? (
                  'You’re keeping an eye on it.'
                ) : (
                  <>
                    Give your spending
                    <br />
                    a little breathing room.
                  </>
                )}
              </h2>
              <p>
                {budgetConfigured
                  ? `You’ve used ${budget.used_percent ?? 0}% of your ${formatMoney(budget.limit, budget.currency)} monthly budget.${budget.over_budget ? ' You’re over — time to review.' : ''}`
                  : 'Set a monthly budget that feels right. We’ll help you keep an eye on it.'}
              </p>
              <button onClick={() => goTo('Budget')}>
                {budgetConfigured ? 'View budget' : 'Set a budget'} <ArrowRight size={15} />
              </button>
            </article>
          </section>
</>
    )}
  </>
);
}
