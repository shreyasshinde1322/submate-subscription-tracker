import { useEffect, useState } from 'react';
import { CalendarDays, CreditCard, Pause, Play, Tag, Trash2, X } from 'lucide-react';
import { useSubMate } from '../context/SubMateContext.jsx';
import {
  CYCLE_LABELS,
  STATUS_LABELS,
  formatDate,
  formatMoney,
  formatDays,
  daysUntil,
  todayISO,
} from '../utils/format.js';
import { ConfirmDialog, ServiceMark, errorMessage } from './ui.jsx';

export function SubscriptionDetail({ subscription, onClose, onEdit }) {
  const { setSubscriptionStatus, removeSubscription, notify } = useSubMate();
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  async function changeStatus(status) {
    setBusy(true);
    try {
      await setSubscriptionStatus(subscription.id, status);
      onClose();
    } catch (err) {
      notify(errorMessage(err), 'error');
      setBusy(false);
    }
  }

  async function performDelete() {
    setBusy(true);
    try {
      await removeSubscription(subscription.id);
      onClose();
    } catch (err) {
      notify(errorMessage(err), 'error');
      setBusy(false);
      setConfirmDelete(false);
    }
  }

  const remaining = daysUntil(subscription.next_renewal_date, todayISO());

  return (
    <div className="modal-scrim" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose();
    }}>
      <section className="add-modal detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-heading">
        <div className="modal-head">
          <div>
            <div className="eyebrow">SUBSCRIPTION DETAILS</div>
            <h2 id="detail-heading">{subscription.service_name}</h2>
          </div>
          <button className="plain-icon" onClick={onClose} disabled={busy} aria-label="Close dialog">
            <X size={19} />
          </button>
        </div>

        <div className="detail-summary">
          <ServiceMark subscription={subscription} size={46} />
          <div>
            <b>{formatMoney(subscription.price, subscription.currency_code)}</b>
            <span>/ {CYCLE_LABELS[subscription.billing_cycle] || subscription.billing_cycle}</span>
          </div>
        </div>

        <dl className="detail-list">
          <div><dt><CreditCard size={14} /> Category</dt><dd>{subscription.category}</dd></div>
          <div><dt><Tag size={14} /> Plan</dt><dd>{subscription.plan_name || '—'}</dd></div>
          <div><dt><CalendarDays size={14} /> Next renewal</dt><dd>
            {formatDate(subscription.next_renewal_date)}
            <span className={`renewal-chip ${remaining < 0 ? 'due-today' : ''}`}>{formatDays(remaining)}</span>
          </dd></div>
          <div><dt>Status</dt><dd><span className={`status-pill status-${subscription.status}`}><i /> {STATUS_LABELS[subscription.status]}</span></dd></div>
          <div><dt>Billing cycle</dt><dd>{CYCLE_LABELS[subscription.billing_cycle]}</dd></div>
          <div><dt>Notes</dt><dd className="detail-notes">{subscription.notes || '—'}</dd></div>
          <div><dt>Created</dt><dd>{new Date(subscription.created_at).toLocaleString()}</dd></div>
          <div><dt>Last updated</dt><dd>{new Date(subscription.updated_at).toLocaleString()}</dd></div>
        </dl>

        {subscription.status !== 'cancelled' ? (
          <div className="detail-actions">
            <button className="secondary-button" onClick={() => onEdit(subscription)} disabled={busy}>
              Edit details
            </button>
            {subscription.status === 'active' && (
              <button className="secondary-button" onClick={() => changeStatus('paused')} disabled={busy}>
                <Pause size={14} /> Pause
              </button>
            )}
            {subscription.status === 'paused' && (
              <button className="primary-button" onClick={() => changeStatus('active')} disabled={busy}>
                <Play size={14} /> Resume
              </button>
            )}
            <button className="secondary-button" onClick={() => changeStatus('cancelled')} disabled={busy}>
              Cancel renewal
            </button>
            <button className="secondary-button danger-text" onClick={() => setConfirmDelete(true)} disabled={busy}>
              <Trash2 size={14} /> Delete
            </button>
          </div>
        ) : (
          <div className="detail-actions">
            <button className="secondary-button" onClick={() => onEdit(subscription)} disabled={busy}>
              Edit details
            </button>
            <button className="primary-button" onClick={() => changeStatus('active')} disabled={busy}>
              <Play size={14} /> Reactivate
            </button>
            <button className="secondary-button danger-text" onClick={() => setConfirmDelete(true)} disabled={busy}>
              <Trash2 size={14} /> Delete
            </button>
          </div>
        )}
      </section>

      {confirmDelete && (
        <ConfirmDialog
          title={`Delete ${subscription.service_name}?`}
          message={`This permanently removes ${subscription.service_name} from your tracker. This can't be undone.`}
          confirmLabel="Delete subscription"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={performDelete}
        />
      )}
    </div>
  );
}