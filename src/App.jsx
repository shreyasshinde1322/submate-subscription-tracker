import { useEffect, useState } from 'react';
import { Download, Menu } from 'lucide-react';
import { SubMateProvider, useSubMate } from './context/SubMateContext.jsx';
import { Sidebar } from './components/Sidebar.jsx';
import { SubscriptionDetail } from './components/SubscriptionDetail.jsx';
import { SubscriptionForm } from './components/SubscriptionForm.jsx';
import { ErrorState, LoadingScreen, Toast } from './components/ui.jsx';
import { Analytics } from './pages/Analytics.jsx';
import { Budget } from './pages/Budget.jsx';
import { Overview } from './pages/Overview.jsx';
import { Renewals } from './pages/Renewals.jsx';
import { Settings } from './pages/Settings.jsx';
import { Subscriptions } from './pages/Subscriptions.jsx';
import { AuthScreen } from './pages/Auth.jsx';
import { api, downloadExport, UNAUTHORIZED_EVENT } from './api/client.js';

function Shell({ page, setPage, user, onLogout }) {
  const { status, error, retry, toast, dashboard } = useSubMate();
  const [modal, setModal] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    function navigate(event) {
      if (event.detail) setPage(event.detail);
    }
    window.addEventListener('submate:navigate', navigate);
    return () => window.removeEventListener('submate:navigate', navigate);
  }, [setPage]);

  if (status === 'loading' || !status) return <LoadingScreen />;
  if (status === 'retry') return <ErrorState error={error} onRetry={retry} />;

  const remindersCount = dashboard && dashboard.upcoming ? dashboard.upcoming.reminders.length : 0;

  const openAdd = () => setModal({ type: 'add' });
  const openEdit = (subscription) => setModal({ type: 'edit', subscription });
  const openDetails = (subscription) => setModal({ type: 'detail', subscription });

  const content = {
    Overview: <Overview openAdd={openAdd} goTo={setPage} openDetails={openDetails} />,
    Subscriptions: (
      <Subscriptions openAdd={openAdd} openEdit={openEdit} openDetails={openDetails} />
    ),
    Renewals: <Renewals goTo={setPage} />,
    Analytics: <Analytics goTo={setPage} />,
    Budget: <Budget />,
    Settings: <Settings />,
  }[page];

  return (
    <div className="app-shell">
      <button className="mobile-menu" onClick={() => setMobileNav((value) => !value)} aria-label="Toggle navigation">
        <Menu size={20} />
      </button>
      <div className={mobileNav ? 'sidebar-wrap open' : 'sidebar-wrap'}>
        <Sidebar
          page={page}
          setPage={(next) => { setPage(next); setMobileNav(false); }}
          remindersCount={page === 'Renewals' ? remindersCount : undefined}
          user={user}
          onLogout={onLogout}
        />
      </div>
      <main className="main-area">
        <div className="main-inner">
          {content}
          <footer className="app-footer">
            <span>Made for a little more peace of mind.</span>
            <span>
              SubMate <i>·</i> Signed in as {user.name}
              <button className="footer-export" onClick={downloadExport}>
                <Download size={12} /> Export CSV
              </button>
            </span>
          </footer>
        </div>
      </main>

      {modal && modal.type === 'add' && (
        <SubscriptionForm subscription={null} onClose={() => setModal(null)} />
      )}
      {modal && modal.type === 'edit' && (
        <SubscriptionForm subscription={modal.subscription} onClose={() => setModal(null)} />
      )}
      {modal && modal.type === 'detail' && (
        <SubscriptionDetail
          subscription={modal.subscription}
          onClose={() => setModal(null)}
          onEdit={(subscription) => setModal({ type: 'edit', subscription })}
        />
      )}
      <Toast toast={toast} />
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [page, setPage] = useState('Overview');

  useEffect(() => {
    let mounted = true;
    api.auth
      .me()
      .then((result) => {
        if (mounted) setUser(result.user);
      })
      .catch(() => {
        if (mounted) setUser(null);
      })
      .finally(() => {
        if (mounted) setCheckingSession(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Expired sessions anywhere in the app immediately return the user to sign in.
  useEffect(() => {
    function handleUnauthorized() {
      setUser(null);
      setPage('Overview');
    }
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  async function logout() {
    try {
      await api.auth.logout();
    } catch {
      // Even if the request fails, clear the local identity so no data leaks.
    }
    setUser(null);
    setPage('Overview');
  }

  if (checkingSession) return <LoadingScreen />;
  if (!user) return <AuthScreen onAuthenticated={setUser} />;

  return (
    <SubMateProvider user={user} onLogout={logout}>
      <Shell page={page} setPage={setPage} user={user} onLogout={logout} />
    </SubMateProvider>
  );
}
