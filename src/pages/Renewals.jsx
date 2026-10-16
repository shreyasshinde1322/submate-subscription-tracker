import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, CircleDollarSign, Clock3 } from 'lucide-react';
import { Header } from '../components/Header.jsx';
import { RenewalRow } from '../components/ui.jsx';
import { useSubMate } from '../context/SubMateContext.jsx';
import { formatMoney, todayISO } from '../utils/format.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function buildCalendar(year, month) {
  const lead = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < lead; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function isoFor(year, month, day) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

export function Renewals({ goTo }) {
  const { subscriptions, dashboard, settings } = useSubMate();
  const now = new Date();
  const [offset, setOffset] = useState(0);
  const display = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const year = display.getFullYear();
  const month = display.getMonth();
  const today = todayISO();

  const active = useMemo(() => subscriptions.filter((sub) => sub.status === 'active'), [subscriptions]);
  const byDate = useMemo(() => {
    const map = new Map();
    for (const sub of active) {
      if (!map.has(sub.next_renewal_date)) map.set(sub.next_renewal_date, []);
      map.get(sub.next_renewal_date).push(sub);
    }
    return map;
  }, [active]);

  const within7 = useMemo(() => (dashboard && dashboard.upcoming ? dashboard.upcoming.within7 || [] : []), [dashboard]);
  const within30 = useMemo(() => (dashboard && dashboard.upcoming ? dashboard.upcoming.within30 || [] : []), [dashboard]);
  const overdueItems = useMemo(() => (dashboard && dashboard.upcoming ? dashboard.upcoming.overdue || [] : []), [dashboard]);

  const preferred = settings ? settings.preferred_currency : 'USD';
  const dueByCurrency = useMemo(() => {
    const totals = new Map();
    for (const item of within7) {
      totals.set(item.currency_code, (totals.get(item.currency_code) || 0) + Number(item.price));
    }
    return [...totals.entries()].map(([currency, amount]) => ({ currency, amount: Math.round(amount * 100) / 100 }));
  }, [within7]);
  const preferredDue = dueByCurrency.find((row) => row.currency === preferred) || { amount: 0 };
  const otherDue = dueByCurrency.filter((row) => row.currency !== preferred);

  const agenda = useMemo(() => {
    const groups = [
      { label: 'Overdue', items: overdueItems },
      { label: 'Next 7 days', items: within7.filter((item) => !item.dueToday).slice(0, 12) },
      { label: 'Next 30 days', items: within30.filter((item) => !item.dueToday && item.daysUntil > 7).slice(0, 12) },
    ];
    return groups.filter((group) => group.items.length > 0);
  }, [within7, within30, overdueItems]);

  const cells = buildCalendar(year, month);
  const currentMonth = offset === 0;

  return (
    <>
      <Header
        eyebrow="YOUR PAYMENT TIMELINE"
        title="Renewals"
        subtitle="Know what’s coming, and when."
        page="Renewals"
        onNotifications={() => goTo('Renewals')}
      />

      <div className="renewal-summary-row">
        <div className="renewal-summary">
          <div className="summary-icon orange"><CalendarDays size={19} /></div>
          <div><span>This week</span><b>{within7.length} renewal{within7.length === 1 ? '' : 's'}</b></div>
        </div>
        <div className="renewal-summary">
          <div className="summary-icon purple"><Clock3 size={19} /></div>
          <div><span>Next 30 days</span><b>{within30.length} renewal{within30.length === 1 ? '' : 's'}</b></div>
        </div>
        <div className="renewal-summary">
          <div className="summary-icon green"><CircleDollarSign size={19} /></div>
          <div><span>Due this week</span><b>{formatMoney(preferredDue.amount, preferred)}{otherDue.length > 0 ? ` +${otherDue.map((row) => formatMoney(row.amount, row.currency)).join(', ')}` : ''}</b></div>
        </div>
      </div>

      <section className="panel calendar-panel">
        <div className="calendar-top">
          <div>
            <div className="eyebrow">RENEWAL CALENDAR</div>
            <h2>{MONTHS[month]} {year}</h2>
          </div>
          <div className="calendar-controls">
            <button className="plain-icon" onClick={() => setOffset((value) => value - 1)} aria-label="Previous month"><ChevronLeft size={17} /></button>
            <button className="today-button" onClick={() => setOffset(0)}>Today</button>
            <button className="plain-icon" onClick={() => setOffset((value) => value + 1)} aria-label="Next month"><ChevronRight size={17} /></button>
          </div>
        </div>
        <div className="calendar-grid">
          {DAY_NAMES.map((name) => <div className="weekday" key={name}>{name}</div>)}
          {cells.map((day, index) => {
            if (day === null) return <div className="calendar-day muted-day" key={index}><span /></div>;
            const iso = isoFor(year, month, day);
            const due = byDate.get(iso) || [];
            const isCurrent = currentMonth && iso === today;
            return (
              <div className={`calendar-day ${isCurrent ? 'current-day' : ''}`} key={iso}>
                <span>{day}</span>
                {due.map((sub) => (
                  <div className="calendar-event" key={sub.id}>
                    <i />
                    {sub.service_name}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        <div className="calendar-legend">
          {[...(active.map((sub) => sub.category))].filter((value, index, self) => self.indexOf(value) === index).slice(0, 4).map((category, index) => (
            <span key={category}>
              <i className={`legend-dot ${['legend-orange', 'legend-purple', 'legend-blue', 'legend-orange'][index % 4]}`} />
              {category}
            </span>
          ))}
        </div>
      </section>

      {active.length > 0 && (
        <section className="agenda-section">
          {agenda.map((group) => (
            <div className="panel agenda-group" key={group.label}>
              <div className="panel-heading">
                <div>
                  <div className="eyebrow">{group.label.toUpperCase()}</div>
                  <h2>{group.label} <span className="soft-count">{String(group.items.length).padStart(2, '0')}</span></h2>
                </div>
              </div>
              <div className="renewal-list">
                {group.items.map((item) => (
                  <RenewalRow key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {active.length === 0 && (
        <p className="muted-inline agenda-empty">No active subscriptions — nothing is scheduled to renew.</p>
      )}
    </>
  );
}
