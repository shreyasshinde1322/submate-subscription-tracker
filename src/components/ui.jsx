import { useState } from 'react';
import { ArrowDownRight, Plus, RotateCw, X } from 'lucide-react';
import { useSubMate } from '../context/SubMateContext.jsx';
import {
  colorFor,
  formatDays,
  formatMoney,
  initials,
  readableTextColor,
} from '../utils/format.js';

export function BrandMark() {
  return (
    <div className="brand-mark">
      <span>s</span>
    </div>
  );
}

export function ServiceMark({ subscription, size }) {
  const { catalogByKey } = useSubMate();
  const [failedKey, setFailedKey] = useState(null);
  const entry = subscription.service_key ? catalogByKey[subscription.service_key] : null;
  const logoKey = subscription.logo_key || (entry && entry.logoKey) || null;
  const name = subscription.service_name;
  const color = (entry && entry.color) || colorFor(name);
  const mark = (entry && entry.mark) || initials(name) || '?';
  const style = size && size !== 31 ? { height: size, width: size } : {};

  if (logoKey && failedKey !== logoKey) {
    return (
      <img
        className="service-mark-img"
        style={style}
        src={`/logos/${encodeURIComponent(logoKey)}.svg`}
        alt=""
        loading="lazy"
        onError={() => setFailedKey(logoKey)}
      />
    );
  }
  return (
    <span
      className="service-mark"
      style={{ background: color, color: readableTextColor(color), ...style }}
      aria-hidden="true"
    >
      {mark}
    </span>
  );
}

export function Metric({ label, value, meta, icon: Icon, tone = '', trend, onClick }) {
  const contents = (
    <>
      <div className="metric-top">
        <span>{label}</span>
        <div className="metric-icon">
          <Icon size={18} />
        </div>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-meta">
        {trend && (
          <span className="trend">
            <ArrowDownRight size={14} /> {trend}
          </span>
        )}
        {meta}
      </div>
    </>
  );
  return onClick ? (
    <button type="button" className={`metric-card metric-card-button ${tone}`} onClick={onClick} aria-label={`${label}: ${value}. View details`}>
      {contents}
    </button>
  ) : <article className={`metric-card ${tone}`}>{contents}</article>;
}

export function LoadingScreen() {
  return (
    <div className="app-loading" role="status" aria-live="polite">
      <BrandMark />
      <p>Loading your tracker…</p>
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="app-loading app-error" role="alert">
      <div className="app-error-icon">!</div>
      <h2>Couldn’t reach the backend</h2>
      <p>{error && error.message ? error.message : 'SubMate is having trouble loading your data.'}</p>
      <button className="primary-button" onClick={onRetry}>
        <RotateCw size={16} /> Try again
      </button>
    </div>
  );
}

export function EmptyState({ title, message, actionLabel, onAction }) {
  return (
    <section className="panel empty-state">
      <BrandMark />
      <h2>{title}</h2>
      <p>{message}</p>
      {actionLabel && onAction && (
        <button className="primary-button" onClick={onAction}>
          <Plus size={16} /> {actionLabel}
        </button>
      )}
    </section>
  );
}

export function RenewalRow({ item, onClick }) {
  const dueClass = item.dueToday || item.overdue ? 'due-today' : '';
  const contents = (
    <>
      <ServiceMark subscription={item} />
      <div className="renewal-info">
        <b>{item.service_name}</b>
        <span>{item.category}</span>
      </div>
      <span className={`due ${dueClass}`}>{formatDays(item.daysUntil)}</span>
      <b className="renewal-price">{formatMoney(item.price, item.currency_code)}</b>
    </>
  );
  return onClick ? (
    <button type="button" className="renewal-row renewal-row-button" onClick={onClick} aria-label={`View ${item.service_name} details`}>
      {contents}
    </button>
  ) : <div className="renewal-row">{contents}</div>;
}

export function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`toast toast-${toast.tone || 'success'}`} role="status" aria-live="polite">
      {toast.message}
    </div>
  );
}

const TREE_COLORS = ['cat-orange', 'cat-purple', 'cat-blue', 'cat-green'];

export function CategoryList({ rows, currencyOverride }) {
  if (!rows || rows.length === 0) {
    return <p className="muted-inline">No active subscriptions yet.</p>;
  }
  return (
    <div className="category-list">
      {rows.map((row, index) => (
        <div className="category-row" key={row.category}>
          <div className={`category-dot ${TREE_COLORS[index % TREE_COLORS.length]}`} />
          <span>{row.category}</span>
          <div className="category-track">
            <i style={{ width: `${Math.max(2, Math.min(100, Number(row.share) || 0))}%` }} />
          </div>
          <b>{formatMoney(row.amount, currencyOverride || row.currency)}</b>
        </div>
      ))}
    </div>
  );
}

export function SimpleBarChart({ data, currency }) {
  const safe = data && data.length ? data : [{ label: 'None', value: 0 }];
  const max = Math.max(...safe.map((item) => Number(item.value) || 0), 1);
  const ticks = [max, (max * 2) / 3, max / 3, 0];
  return (
    <div className="chart-wrap">
      <div className="chart-y">
        {ticks.map((tick, index) => (
          <span key={index}>{formatMoney(tick, currency)}</span>
        ))}
      </div>
      <div className="chart-main">
        <div className="chart-grid">
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="bars">
          {safe.map((item) => (
            <div className="bar-group" key={item.label}>
              <div
                className="bar"
                style={{ height: `${(Number(item.value) / max) * 100}%` }}
                title={`${item.label}: ${formatMoney(item.value, currency)}`}
              />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onCancel }) {
  return (
    <div
      className="modal-scrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && onCancel) onCancel();
      }}
    >
      <section
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <div className="modal-head">
          <div>
            <div className="eyebrow">ARE YOU SURE?</div>
            <h2 id="confirm-title">{title}</h2>
          </div>
          {onCancel && (
            <button className="plain-icon" onClick={onCancel} aria-label="Close dialog">
              <X size={19} />
            </button>
          )}
        </div>
        <p className="confirm-message">{message}</p>
        <div className="modal-actions">
          <button className="secondary-button" onClick={onCancel} type="button">
            Keep it
          </button>
          <button className="primary-button danger-button" onClick={onConfirm} type="button" autoFocus>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export function FieldError({ message }) {
  if (!message) return null;
  return <span className="field-error">{message}</span>;
}

export function errorMessage(err, fallback = 'Something went wrong.') {
  return err && err.message ? err.message : fallback;
}

export { formatMoney, initials };
