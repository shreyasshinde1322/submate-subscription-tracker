import { useEffect, useRef, useState } from 'react';
import { Bell, CalendarDays, ChevronRight, Plus } from 'lucide-react';
import { useSubMate } from '../context/SubMateContext.jsx';
import { formatDays } from '../utils/format.js';

export function Header({ eyebrow, title, subtitle, onAdd, onNotifications, remindersCount }) {
  const { dashboard } = useSubMate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationRef = useRef(null);
  const reminders = dashboard?.upcoming?.reminders || [];
  const count = remindersCount ?? reminders.length;
  const openRenewals = () => {
    setNotificationsOpen(false);
    if (onNotifications) onNotifications();
    else window.dispatchEvent(new CustomEvent('submate:navigate', { detail: 'Renewals' }));
  };

  useEffect(() => {
    function closeOnOutside(event) {
      if (!notificationRef.current?.contains(event.target)) setNotificationsOpen(false);
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') setNotificationsOpen(false);
    }
    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  return (
    <header className="page-header">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="header-actions">
        <div className="notification-wrap" ref={notificationRef}>
          <button className="icon-button notification" aria-label="View renewal reminders" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)}>
            <Bell size={18} />
            {count > 0 && <i />}
          </button>
          {notificationsOpen && (
            <div className="notification-popover" role="dialog" aria-label="Renewal reminders">
              <div className="notification-head"><div><span className="eyebrow">A HEADS-UP</span><b>Renewal reminders</b></div><span className="soft-count">{count}</span></div>
              {reminders.length ? (
                <div className="notification-list">
                  {reminders.slice(0, 5).map((item) => (
                    <button key={item.id} onClick={openRenewals}>
                      <span className="notification-calendar"><CalendarDays size={15} /></span>
                      <span className="notification-copy"><b>{item.service_name}</b><small>{item.dueToday ? 'Renews today' : formatDays(item.daysUntil)}</small></span>
                      <ChevronRight size={15} />
                    </button>
                  ))}
                </div>
              ) : <p className="notification-empty">You’re all caught up. No renewals need a reminder right now.</p>}
              <button className="notification-footer" onClick={openRenewals}>Open renewal calendar <ChevronRight size={14} /></button>
            </div>
          )}
        </div>
        {typeof onAdd === 'function' && (
          <button className="primary-button" onClick={onAdd}>
            <Plus size={17} /> Add subscription
          </button>
        )}
      </div>
    </header>
  );
}
