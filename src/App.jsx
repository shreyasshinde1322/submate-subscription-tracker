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
import { Welcome } from './pages/Welcome.jsx';
import { api, downloadExport } from './api/client.js';

function Shell({ page, setPage, onExit }) {
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
          onExit={onExit}
        />
      </div>
      <main className="main-area">
        <div className="main-inner">
          {content}
          <footer className="app-footer">
            <span>Made for a little more peace of mind.</span>
            <span>
              SubMate <i>·</i> Local single-user tracker
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
  const [authStatus, setAuthStatus] = useState(null);
  const [entered, setEntered] = useState(false);
  const [page, setPage] = useState('Overview');
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    api.auth.status()
      .then((result) => { if (mounted) setAuthStatus(result); })
      .catch((error) => { if (mounted) setAuthStatus({ error: error.message || 'Could not reach the local server.' }); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (authStatus?.authenticated) setEntered(true);
  }, [authStatus]);

  async function enterWithPassphrase(credentials) {
    setAuthBusy(true);
    setAuthError('');
    try {
      const result = authStatus?.configured
        ? await api.auth.login({ password: credentials.password })
        : await api.auth.setup(credentials);
      setAuthStatus({ configured: true, authenticated: true, username: result.username });
      setEntered(true);
    } catch (error) {
      setAuthError(error.validation?.password || error.validation?.username || error.message || 'Could not unlock the local tracker.');
    } finally {
      setAuthBusy(false);
    }
  }

  async function lockTracker() {
    try {
      await api.auth.logout();
      setAuthStatus((current) => ({ ...current, authenticated: false }));
      setEntered(false);
    } catch (error) {
      setAuthError(error.message || 'Could not lock the local tracker.');
    }
  }

  if (!authStatus) return <LoadingScreen />;
  if (!entered) return <Welcome configured={authStatus.configured} username={authStatus.username} error={authError || authStatus.error} busy={authBusy} onSubmit={enterWithPassphrase} />;

  return (
    <SubMateProvider>
      <Shell page={page} setPage={setPage} onExit={lockTracker} />
    </SubMateProvider>
  );
}
