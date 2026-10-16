import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Plus, X } from 'lucide-react';
import { useSubMate } from '../context/SubMateContext.jsx';
import { CURRENCIES, CYCLE_LABELS, formatDate } from '../utils/format.js';
import { FieldError, ServiceMark, errorMessage } from './ui.jsx';

function todayISO() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const defaultForm = {
  service_name: '',
  price: '',
  currency_code: 'USD',
  billing_cycle: 'monthly',
  category: '',
  next_renewal_date: todayISO(),
  plan_name: '',
  notes: '',
  service_key: null,
  logo_key: null,
  status: 'active',
};

export function SubscriptionForm({ subscription, onClose }) {
  const {
    catalog,
    categories,
    createSubscription,
    updateSubscription,
  } = useSubMate();

  const [form, setForm] = useState(() => {
    if (!subscription) return defaultForm;
    return {
      service_name: subscription.service_name || '',
      price: subscription.price != null ? String(subscription.price) : '',
      currency_code: subscription.currency_code || 'USD',
      billing_cycle: subscription.billing_cycle || 'monthly',
      category: subscription.category || '',
      next_renewal_date: subscription.next_renewal_date || todayISO(),
      plan_name: subscription.plan_name || '',
      notes: subscription.notes || '',
      service_key: subscription.service_key || null,
      logo_key: subscription.logo_key || null,
      status: subscription.status || 'active',
    };
  });
  const [clientErrors, setClientErrors] = useState({});
  const [serverErrors, setServerErrors] = useState({});
  const [topError, setTopError] = useState(null);
  const [duplicates, setDuplicates] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');

  const pickerResults = useMemo(() => {
    const query = pickerQuery.trim().toLowerCase();
    if (!query) return [];
    return (catalog ? catalog.services : []).filter((service) => {
      return (
        service.name.toLowerCase().includes(query) ||
        service.key.toLowerCase().includes(query) ||
        service.category.toLowerCase().includes(query)
      );
    });
  }, [catalog, pickerQuery]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  function set(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function selectCatalogService(service) {
    setForm((current) => ({
      ...current,
      service_name: service.name,
      category: current.category || service.category,
      service_key: service.key,
      logo_key: service.logoKey,
    }));
    setPickerQuery('');
  }

  function useCustomService() {
    setForm((current) => ({
      ...current,
      service_key: null,
      logo_key: null,
    }));
    setPickerQuery('');
  }

  function payload() {
    return {
      service_name: form.service_name,
      price: Number(form.price),
      currency_code: form.currency_code,
      billing_cycle: form.billing_cycle,
      category: form.category,
      next_renewal_date: form.next_renewal_date,
      status: form.status,
      plan_name: form.plan_name ? form.plan_name.trim() : null,
      notes: form.notes ? form.notes.trim() : null,
      service_key: form.service_key || null,
      logo_key: form.logo_key || null,
    };
  }

  function validate() {
    const errors = {};
    if (!form.service_name.trim()) errors.service_name = 'Service name is required.';
    const price = Number(form.price);
    if (!form.price || !Number.isFinite(price) || price <= 0) {
      errors.price = 'Enter a price greater than zero.';
    }
    if (!form.category.trim()) errors.category = 'Category is required.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.next_renewal_date)) {
      errors.next_renewal_date = 'Choose a valid renewal date.';
    }
    setClientErrors(errors);
    setServerErrors({});
    return Object.keys(errors).length === 0;
  }

  async function submit(force = false) {
    if (!force && !validate()) return;
    setSaving(true);
    setTopError(null);
    setDuplicates(null);
    try {
      if (subscription) {
        await updateSubscription(subscription.id, payload(), force);
      } else {
        await createSubscription(payload(), force);
      }
      onClose();
    } catch (err) {
      if (err && err.status === 409 && err.details && err.details.code === 'DUPLICATE_WARNING') {
        setDuplicates(err.details.duplicates || []);
      } else if (err && err.validation) {
        setServerErrors(err.validation);
      } else {
        setTopError(errorMessage(err, 'Could not save this subscription.'));
      }
    } finally {
      setSaving(false);
    }
  }

  const title = subscription ? 'Edit subscription' : 'Add subscription';
  const subtitle = subscription
    ? 'Keep this renewal in sync with reality.'
    : 'Keep all your recurring plans in one place.';

  return (
    <div
      className="modal-scrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <section className="add-modal" role="dialog" aria-modal="true" aria-labelledby="modal-heading">
        <div className="modal-head">
          <div>
            <div className="eyebrow">A NEW LITTLE COMMITMENT</div>
            <h2 id="modal-heading">{title}</h2>
            <p>{subtitle}</p>
          </div>
          <button className="plain-icon" onClick={onClose} disabled={saving} aria-label="Close dialog">
            <X size={19} />
          </button>
        </div>

        {duplicates && (
          <div className="inline-alert" role="alert">
            <div className="inline-alert-title">
              <AlertTriangle size={15} /> A similar subscription already exists
            </div>
            {duplicates.map((item) => (
              <div className="duplicate-row" key={item.id}>
                <span>{item.service_name}</span>
                <span>
                  {formatDate(item.next_renewal_date)} · {item.billing_cycle}
                </span>
              </div>
            ))}
            <p>You can still save this if it’s a separate plan — it’s your call.</p>
            <div className="modal-actions">
              <button className="secondary-button" type="button" onClick={() => setDuplicates(null)}>
                Review my entry
              </button>
              <button
                className="primary-button"
                type="button"
                onClick={() => submit(true)}
                disabled={saving}
              >
                <Check size={15} /> Save anyway
              </button>
            </div>
          </div>
        )}

        {!duplicates && (
          <form onSubmit={(event) => { event.preventDefault(); submit(false); }} noValidate>
            {topError && <div className="inline-alert inline-error">{topError}</div>}

            <div className="picker-wrap">
              <span className="picker-label">Or pick from the catalog</span>
              <div className="picker-search">
                <input
                  type="search"
                  placeholder="Search Netflix, Spotify, gym membership…"
                  value={pickerQuery}
                  onChange={(event) => setPickerQuery(event.target.value)}
                  aria-label="Search subscription catalog"
                />
                {form.service_key && (
                  <button type="button" className="picker-clear" onClick={useCustomService}>
                    <X size={13} /> Custom service
                  </button>
                )}
              </div>
              {pickerQuery.trim() !== '' && (
                <div className="picker-results" role="listbox">
                  {pickerResults.length === 0 && <p className="picker-empty">No catalog match — nothing to choose.</p>}
                  {pickerResults.slice(0, 6).map((service) => (
                    <button
                      type="button"
                      className="picker-result"
                      key={service.key}
                      onClick={() => selectCatalogService(service)}
                      role="option"
                      aria-selected={form.service_key === service.key}
                    >
                      <ServiceMark subscription={{ service_key: service.key, service_name: service.name }} size={30} />
                      <span className="picker-result-name">{service.name}</span>
                      <small>{service.category}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <label htmlFor="field-service-name">
              Service name
              <input
                id="field-service-name"
                value={form.service_name}
                onChange={(event) => set('service_name', event.target.value)}
                placeholder="e.g. Netflix"
                maxLength={120}
              />
              <FieldError message={clientErrors.service_name || serverErrors.service_name} />
            </label>

            <div className="form-two">
              <label htmlFor="field-price">
                Price
                <input
                  id="field-price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.price}
                  onChange={(event) => set('price', event.target.value)}
                  placeholder="0.00"
                  inputMode="decimal"
                />
                <FieldError message={clientErrors.price || serverErrors.price} />
              </label>
              <label htmlFor="field-cycle">
                Billing cycle
                <select
                  id="field-cycle"
                  className="select-input"
                  value={form.billing_cycle}
                  onChange={(event) => set('billing_cycle', event.target.value)}
                >
                  {Object.entries(CYCLE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                <FieldError message={serverErrors.billing_cycle} />
              </label>
            </div>

            <div className="form-two">
              <label htmlFor="field-currency">
                Currency
                <select
                  id="field-currency"
                  className="select-input"
                  value={form.currency_code}
                  onChange={(event) => set('currency_code', event.target.value)}
                >
                  {CURRENCIES.map((code) => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
                <FieldError message={serverErrors.currency_code} />
              </label>
              <label htmlFor="field-renewal">
                Next renewal
                <input
                  id="field-renewal"
                  type="date"
                  value={form.next_renewal_date}
                  onChange={(event) => set('next_renewal_date', event.target.value)}
                />
                <FieldError message={clientErrors.next_renewal_date || serverErrors.next_renewal_date} />
              </label>
            </div>

            <label htmlFor="field-category">
              Category
              <input
                id="field-category"
                list="category-options"
                value={form.category}
                onChange={(event) => set('category', event.target.value)}
                placeholder="Choose or type a category"
                maxLength={80}
              />
              <datalist id="category-options">
                {categories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
              <FieldError message={clientErrors.category || serverErrors.category} />
            </label>

            <div className="form-two">
              <label htmlFor="field-plan">
                Plan name <span className="optional">Optional</span>
                <input
                  id="field-plan"
                  value={form.plan_name}
                  onChange={(event) => set('plan_name', event.target.value)}
                  placeholder="e.g. Standard, Family"
                  maxLength={120}
                />
                <FieldError message={serverErrors.plan_name} />
              </label>
              {subscription && (
                <label htmlFor="field-status">
                  Status
                  <select
                    id="field-status"
                    className="select-input"
                    value={form.status}
                    onChange={(event) => set('status', event.target.value)}
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <FieldError message={serverErrors.status} />
                </label>
              )}
            </div>

            <label htmlFor="field-notes">
              Notes <span className="optional">Optional</span>
              <textarea
                id="field-notes"
                rows="3"
                value={form.notes}
                onChange={(event) => set('notes', event.target.value)}
                placeholder="A note to future you…"
                maxLength={1000}
              />
              <FieldError message={serverErrors.notes} />
            </label>

            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="primary-button" disabled={saving}>
                {saving ? (
                  'Saving…'
                ) : (
                  <>
                    <Plus size={16} /> {subscription ? 'Save changes' : 'Add subscription'}
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

export function ChevronDownIcon() {
  return null;
}