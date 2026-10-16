import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Activity,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Download,
  Ellipsis,
} from 'lucide-react';
import { Header } from '../components/Header.jsx';
import { ConfirmDialog, EmptyState, Metric, ServiceMark } from '../components/ui.jsx';
import { useSubMate } from '../context/SubMateContext.jsx';
import { downloadExport } from '../api/client.js';
import { CYCLE_LABELS, STATUS_LABELS, daysUntil, formatDate, formatDays, formatMoney, todayISO } from '../utils/format.js';

const PAGE_SIZE = 8;

const SORT_OPTIONS = {
  service_name: 'Service name',
  next_renewal_date: 'Next renewal',
  price: 'Amount',
  category: 'Category',
  status: 'Status',
};

export function Subscriptions({ openAdd, openEdit, openDetails }) {
  const { subscriptions, dashboard, settings, setSubscriptionStatus, removeSubscription, notify } = useSubMate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [sortBy, setSortBy] = useState('next_renewal_date');
  const [order, setOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const [menuFor, setMenuFor] = useState(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const preferred = settings ? settings.preferred_currency : 'USD';
  const dash = dashboard || {};

  useEffect(() => {
    setPage(1);
  }, [search, category, status]);

  useEffect(() => {
    if (!menuFor) return undefined;
    function closeMenu(event) {
      if (!event.target.closest('.row-menu-anchor, .row-menu-portal')) {
        setMenuFor(null);
        setMenuPosition(null);
      }
    }
    document.addEventListener('mousedown', closeMenu);
    const closeOnScroll = () => { setMenuFor(null); setMenuPosition(null); };
    window.addEventListener('scroll', closeOnScroll, true);
    window.addEventListener('resize', closeOnScroll);
    return () => {
      document.removeEventListener('mousedown', closeMenu);
      window.removeEventListener('scroll', closeOnScroll, true);
      window.removeEventListener('resize', closeOnScroll);
    };
  }, [menuFor]);

  function toggleRowMenu(event, item) {
    if (menuFor === item.id) {
      setMenuFor(null);
      setMenuPosition(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const estimatedHeight = item.status === 'active' ? 222 : 188;
    const top = rect.bottom + estimatedHeight < window.innerHeight
      ? rect.bottom + 5
      : Math.max(10, rect.top - estimatedHeight - 5);
    const left = Math.max(10, Math.min(window.innerWidth - 184, rect.right - 170));
    setMenuPosition({ top, left });
    setMenuFor(item.id);
  }

  const categories = useMemo(() => {
    const set = new Set(subscriptions.map((sub) => sub.category));
    return ['all', ...[...set].sort()];
  }, [subscriptions]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const list = subscriptions.filter((sub) => {
      if (category !== 'all' && sub.category !== category) return false;
      if (status !== 'all' && sub.status !== status) return false;
      if (needle) {
        const haystack = `${sub.service_name} ${sub.category} ${sub.plan_name || ''} ${sub.notes || ''}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
    const collator = new Intl.Collator('en');
    list.sort((a, b) => {
      let result = 0;
      if (sortBy === 'price') result = a.price - b.price;
      else if (sortBy === 'next_renewal_date') result = a.next_renewal_date.localeCompare(b.next_renewal_date);
      else result = collator.compare(String(a[sortBy] || ''), String(b[sortBy] || ''));
      return order === 'asc' ? result : -result;
    });
    return list;
  }, [subscriptions, search, category, status, sortBy, order]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const monthlyTotal = (dash.monthly_by_currency || []).find((row) => row.currency === preferred);
  const annualTotal = (dash.annual_by_currency || []).find((row) => row.currency === preferred);
  const multiCurrency = (dash.monthly_by_currency || []).length > 1;

  async function runAction(fn, id) {
    setBusyId(id);
    try {
      await fn();
    } catch (error) {
      notify(error.message || 'Could not update this subscription.', 'error');
    } finally {
      setBusyId(null);
      setMenuFor(null);
      setMenuPosition(null);
    }
  }

  async function performDelete() {
    setBusyId(toDelete ? toDelete.id : null);
    try {
      await removeSubscription(toDelete.id);
      setToDelete(null);
    } catch (error) {
      notify(error.message || 'Could not delete this subscription.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  if (subscriptions.length === 0) {
    return (
      <>
        <Header
          eyebrow="YOUR SERVICES"
          title="Subscriptions"
          subtitle="All the things you’ve chosen to keep close."
          onAdd={openAdd}
          page="Subscriptions"
        />
        <EmptyState
          title="No subscriptions yet."
          message="Add a plan, membership or subscription and it will live right here, safely stored in your local SubMate database."
          actionLabel="Add subscription"
          onAction={openAdd}
        />
      </>
    );
  }

  return (
    <>
      <Header
        eyebrow="YOUR SERVICES"
        title="Subscriptions"
        subtitle="All the things you’ve chosen to keep close."
        onAdd={openAdd}
        page="Subscriptions"
        notifications
        remindersCount={dash.upcoming ? dash.upcoming.reminders.length : 0}
      />

      <div className="metric-grid compact-metrics">
        <Metric
          label="Monthly total"
          value={monthlyTotal ? formatMoney(monthlyTotal.amount, preferred) : formatMoney(0, preferred)}
          meta={multiCurrency ? `Preferred: ${preferred} (other currencies shown per record)` : `${dash.active_count || 0} active services`}
          icon={CircleDollarSign}
          tone="metric-primary"
        />
        <Metric
          label="Yearly estimate"
          value={annualTotal ? formatMoney(annualTotal.amount, preferred) : formatMoney(0, preferred)}
          meta="Based on current active plans"
          icon={Activity}
        />
        <Metric
          label="Paused"
          value={String(dash.paused_count ?? 0).padStart(2, '0')}
          meta="Not in your monthly total"
          icon={Clock3}
        />
      </div>

      <section className="panel table-panel">
        <div className="table-toolbar">
          <div className="filter-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              placeholder="Find a subscription…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Find a subscription"
            />
          </div>
          <div className="toolbar-actions">
            <label className="select-button toolbar-select">
              <span>Category</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category">
                <option value="all">All</option>
                {categories.filter((item) => item !== 'all').map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
              <ChevronDown size={14} />
            </label>
            <label className="select-button toolbar-select">
              <span>Status</span>
              <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
                <option value="all">All</option>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <ChevronDown size={14} />
            </label>
            <label className="select-button toolbar-select">
              <span>Sort</span>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort by">
                {Object.entries(SORT_OPTIONS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <ChevronDown size={14} />
            </label>
            <button
              className="plain-icon order-toggle"
              onClick={() => setOrder((current) => (current === 'asc' ? 'desc' : 'asc'))}
              title={order === 'asc' ? 'Ascending' : 'Descending'}
              aria-label={`Sort ${order === 'asc' ? 'descending' : 'ascending'}`}
            >
              {order === 'asc' ? '↑' : '↓'}
            </button>
            <button className="select-button export-button" onClick={downloadExport} title="Download your subscriptions as CSV">
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Service</th>
                <th>Category</th>
                <th>Plan</th>
                <th>Cycle</th>
                <th>Next renewal</th>
                <th>Status</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((item) => (
                <tr key={item.id}>
                  <td>
                    <button
                      className="service-cell service-cell-button"
                      onClick={() => openDetails(item)}
                      title={`View ${item.service_name} details`}
                    >
                      <ServiceMark subscription={item} />
                      <div>
                        <b>{item.service_name}</b>
                        <small>{item.plan_name || '—'}</small>
                      </div>
                    </button>
                  </td>
                  <td><span className="table-category">{item.category}</span></td>
                  <td>{item.plan_name || '—'}</td>
                  <td>{CYCLE_LABELS[item.billing_cycle] || item.billing_cycle}</td>
                  <td>
                    <span className={`due ${item.status === 'active' ? 'due-today' : ''}`}>
                      {formatDate(item.next_renewal_date)}
                    </span>
                    {item.status === 'active' && (
                      <small className="renewal-days">{formatDays(daysUntil(item.next_renewal_date, todayISO()))}</small>
                    )}
                  </td>
                  <td><span className={`status-pill status-${item.status}`}><i /> {STATUS_LABELS[item.status]}</span></td>
                  <td className="amount-cell">{formatMoney(item.price, item.currency_code)}<small> / {CYCLE_LABELS[item.billing_cycle].toLowerCase()}</small></td>
                  <td className="row-menu-anchor">
                    <button
                      className="row-more"
                      aria-label={`More options for ${item.service_name}`}
                      onClick={(event) => toggleRowMenu(event, item)}
                      disabled={busyId === item.id}
                    >
                      {busyId === item.id ? '…' : <Ellipsis size={18} />}
                    </button>
                    {menuFor === item.id && menuPosition && createPortal(
                      <div className="row-menu row-menu-portal" role="menu" style={menuPosition}>
                        <button role="menuitem" onClick={() => { setMenuFor(null); openDetails(item); }}>Details</button>
                        <button role="menuitem" onClick={() => { setMenuFor(null); openEdit(item); }}>Edit</button>
                        {item.status === 'active' && (
                          <button role="menuitem" onClick={() => runAction(() => setSubscriptionStatus(item.id, 'paused'), item.id)}>Pause</button>
                        )}
                        {item.status === 'paused' && (
                          <button role="menuitem" onClick={() => runAction(() => setSubscriptionStatus(item.id, 'active'), item.id)}>Resume</button>
                        )}
                        {item.status !== 'cancelled' && (
                          <button role="menuitem" onClick={() => runAction(() => setSubscriptionStatus(item.id, 'cancelled'), item.id)}>Cancel renewal</button>
                        )}
                        {item.status === 'cancelled' && (
                          <button role="menuitem" onClick={() => runAction(() => setSubscriptionStatus(item.id, 'active'), item.id)}>Reactivate</button>
                        )}
                        <button role="menuitem" className="menu-danger" onClick={() => { setMenuFor(null); setToDelete(item); }}>Delete</button>
                      </div>,
                      document.body,
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="table-bottom">
          <span>Showing {pageRows.length} of {filtered.length} subscriptions</span>
          {totalPages > 1 && (
            <div>
              <button onClick={() => setPage(Math.max(1, safePage - 1))} disabled={safePage === 1} aria-label="Previous page">
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((num) => (
                <button key={num} className={num === safePage ? 'page-current' : ''} onClick={() => setPage(num)}>
                  {num}
                </button>
              ))}
              <button onClick={() => setPage(Math.min(totalPages, safePage + 1))} disabled={safePage === totalPages} aria-label="Next page">
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {filtered.length === 0 && (
          <div className="table-empty">No subscriptions match your filters.</div>
        )}
      </section>

      {toDelete && (
        <ConfirmDialog
          title={`Delete ${toDelete.service_name}?`}
          message={`This permanently removes ${toDelete.service_name} (${formatMoney(toDelete.price, toDelete.currency_code)} / ${CYCLE_LABELS[toDelete.billing_cycle]}) from your tracker.`}
          confirmLabel="Delete subscription"
          onCancel={() => setToDelete(null)}
          onConfirm={performDelete}
        />
      )}
    </>
  );
}
