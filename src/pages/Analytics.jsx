import { Activity, ArrowDownRight, CircleDollarSign, Zap, CalendarClock } from 'lucide-react';
import { Header } from '../components/Header.jsx';
import { CategoryList, Metric, SimpleBarChart, ServiceMark } from '../components/ui.jsx';
import { useSubMate } from '../context/SubMateContext.jsx';
import { CYCLE_LABELS, formatMoney, shortCategory } from '../utils/format.js';

export function Analytics({ goTo }) {
  const { dashboard, settings } = useSubMate();
  const preferred = settings ? settings.preferred_currency : 'USD';
  const dash = dashboard || {};

  const monthlyRows = dash.monthly_by_currency || [];
  const preferredMonthly = monthlyRows.find((row) => row.currency === preferred);
  const preferredAnnual = (dash.annual_by_currency || []).find((row) => row.currency === preferred);
  const top = (dash.top_expensive || [])[0];
  const overdue = (dash.upcoming && dash.upcoming.overdue) || [];
  const monthly = preferredMonthly ? preferredMonthly.amount : 0;

  const categoryGroups = dash.categories_by_currency || [];
  const categoryGroup = categoryGroups.find((group) => group.currency === preferred) || categoryGroups[0] || null;
  const chartData = categoryGroup
    ? categoryGroup.categories.slice(0, 8).map((row) => ({ label: shortCategory(row.category), value: row.amount }))
    : [];

  const savings = dash.listPriceSavings ?? null;

  return (
    <>
      <Header
        eyebrow="YOUR SPENDING, MADE VISIBLE"
        title="Analytics"
        subtitle="Small patterns can make a big difference."
        page="Analytics"
        onNotifications={() => goTo('Renewals')}
      />

      <div className="metric-grid">
        <Metric
          label="Monthly spend"
          value={formatMoney(monthly, preferred)}
          meta={monthlyRows.length > 1 ? `Grouped across ${monthlyRows.length} currencies` : 'Across all active plans'}
          icon={CircleDollarSign}
          tone="metric-primary"
        />
        <Metric
          label="Annual projection"
          value={preferredAnnual ? formatMoney(preferredAnnual.amount, preferred) : formatMoney(0, preferred)}
          meta={`${dash.active_count || 0} active plans`}
          icon={Activity}
        />
        <Metric
          label="Most expensive"
          value={top ? top.service_name : '—'}
          meta={top ? `${formatMoney(top.monthly_equivalent, top.currency_code)} per month` : 'No active subscriptions'}
          icon={Zap}
        />
        <Metric
          label="Overdue renewals"
          value={String(overdue.length).padStart(2, '0')}
          meta={overdue.length ? 'Update these renewal dates soon' : 'Nothing overdue'}
          icon={CalendarClock}
          tone={overdue.length ? 'metric-alert' : ''}
        />
      </div>

      <section className="panel analytics-chart-panel">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">CURRENT MONTH</div>
            <h2>Your recurring spend, by category</h2>
            <p>Monthly equivalent across active subscriptions</p>
          </div>
          {savings ? (
            <span className="trend"><ArrowDownRight size={14} /> {savings}</span>
          ) : (
            <button className="select-button">{new Date().getFullYear()}</button>
          )}
        </div>
        <SimpleBarChart data={chartData} currency={categoryGroup ? categoryGroup.currency : preferred} />
      </section>

      <section className="panel analytics-lower">
        <div>
          <div className="eyebrow">CATEGORY BREAKDOWN</div>
          <h2>What makes up your spend</h2>
          <CategoryList rows={categoryGroup ? categoryGroup.categories : []} currencyOverride={categoryGroup ? categoryGroup.currency : preferred} />
        </div>
        <div className="top-services">
          <div className="eyebrow">TOP SERVICES</div>
          <h2>Your biggest commitments</h2>
          {(dash.top_expensive || []).slice(0, 5).map((item) => (
            <div className="top-service" key={item.id}>
              <ServiceMark subscription={item} />
              <b>{item.service_name}</b>
              <span>{formatMoney(item.monthly_equivalent, item.currency_code)}<small> / mo</small></span>
              <small>{CYCLE_LABELS[item.billing_cycle]}</small>
            </div>
          ))}
          {(dash.top_expensive || []).length === 0 && <p className="muted-inline">No active subscriptions yet.</p>}
        </div>
      </section>
    </>
  );
}
