import { useState } from 'react';
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CreditCard,
  Ellipsis,
  House,
  LogOut,
  Settings,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { BrandMark } from './ui.jsx';

export function Sidebar({ page, setPage, remindersCount, user, onLogout }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const displayName = user?.name || 'Your account';
  const initials = (displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('') || 'SM').toUpperCase();
  const primary = [
    { label: 'Home', icon: House },
    { label: 'Subscriptions', icon: CreditCard },
    { label: 'Renewals', icon: CalendarDays, count: remindersCount },
    { label: 'Analytics', icon: Activity },
  ];
  const preferences = [
    { label: 'Budget', icon: Wallet },
    { label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <BrandMark />
        <div>
          <b>submate</b>
          <small>spend with intention</small>
        </div>
      </div>
      <button className="search-box" onClick={() => setPage('Subscriptions')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <span>Search subscriptions</span>
      </button>
      <div className="side-label">WORKSPACE</div>
      <nav>
        {primary.map(({ label, icon: Icon, count }) => (
          <button
            key={label}
            className={`nav-item ${page === (label === 'Home' ? 'Overview' : label) ? 'selected' : ''}`}
            onClick={() => setPage(label === 'Home' ? 'Overview' : label)}
          >
            <Icon size={18} strokeWidth={1.8} />
            <span>{label}</span>
            {count !== undefined && <em>{count}</em>}
          </button>
        ))}
      </nav>
      <div className="side-label side-label-gap">PREFERENCES</div>
      <nav>
        {preferences.map(({ label, icon: Icon }) => (
          <button
            key={label}
            className={`nav-item ${page === label ? 'selected' : ''}`}
            onClick={() => setPage(label)}
          >
            <Icon size={18} strokeWidth={1.8} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="upgrade-card">
          <div className="upgrade-icon">
            <Sparkles size={17} />
          </div>
          <b>A little more clarity</b>
          <p>See where your monthly spend is going.</p>
          <button onClick={() => setPage('Analytics')}>
            Explore insights <ArrowRight size={14} />
          </button>
          <div className="upgrade-glow" />
        </div>
        <div className="profile">
          <div className="avatar">{initials}</div>
          <div>
            <b>{displayName}</b>
            <small>{user?.email || 'Signed in'}</small>
          </div>
          <button className="profile-menu" aria-label="Open account menu" aria-expanded={profileOpen} onClick={() => setProfileOpen((open) => !open)}>
            <Ellipsis size={19} />
          </button>
          {profileOpen && (
            <div className="profile-popover" role="menu">
              <div className="profile-popover-heading"><b>{displayName}</b><small>{user?.email || 'Signed in'}</small></div>
              <button role="menuitem" onClick={() => { setPage('Overview'); setProfileOpen(false); }}><House size={15} /> Go to home</button>
              <button role="menuitem" onClick={() => { setPage('Settings'); setProfileOpen(false); }}><Settings size={15} /> Account settings</button>
              <button role="menuitem" onClick={() => { setProfileOpen(false); onLogout?.(); }}><LogOut size={15} /> Sign out</button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
