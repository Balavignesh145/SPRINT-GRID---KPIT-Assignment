import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { LayoutDashboard, LogOut, Bell, Search } from 'lucide-react';
import { auth, notifications } from '../../api/client';
import { useQuery } from '@tanstack/react-query';
import { NotificationPanel } from '../notifications/NotificationPanel';
import { CommandPalette } from '../command/CommandPalette';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showNotifications, setShowNotifications] = useState(false);

  const { data: userData } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => auth.me()
  });

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notifications.list(),
    refetchInterval: 30_000
  });

  const user = userData?.data;
  const unreadCount = notifData?.meta?.unreadCount ?? 0;
  const [showSearch, setShowSearch] = useState(false);

  // Ctrl+K listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch((v) => !v);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  async function handleLogout() {
    try {
      await auth.logout();
    } catch (err) {
      console.error('Logout failed:', err);
    }
    qc.clear();
    navigate('/login');
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--color-bg)' }}>
      {/* TopBar */}
      <header className="topbar">
        <Link to="/dashboard" className="flex items-center gap-2.5 shrink-0">
          <img
            src="/brand/sprintgrid-logo.png"
            alt="SprintGrid Logo"
            className="object-contain"
            style={{ width: 28, height: 28, mixBlendMode: 'screen', filter: 'brightness(1.1)' }}
          />
          <span className="font-bold text-sm tracking-tight" style={{ color: 'var(--color-text)' }}>
            SprintGrid
          </span>
        </Link>

        {/* Search Trigger Button */}
        <button
          onClick={() => setShowSearch(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-surface-strong cursor-pointer ml-4"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-muted)',
            width: '160px'
          }}
        >
          <Search size={12} />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="text-[9px] font-mono opacity-60">Ctrl+K</kbd>
        </button>

        <div className="flex-1" />

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications((v) => !v)}
            className="relative flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
            style={{ color: 'var(--color-muted)' }}
            aria-label="Notifications"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
                style={{ background: 'var(--color-brand)', color: 'var(--color-bg)' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {showNotifications && (
            <NotificationPanel
              notifications={notifData?.data ?? []}
              onClose={() => setShowNotifications(false)}
            />
          )}
        </div>

        {/* User Menu */}
        {user && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: 'var(--color-surface-strong)', color: 'var(--color-brand)', border: '1px solid var(--color-border)' }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:block text-sm" style={{ color: 'var(--color-soft)' }}>
              {user.name.split(' ')[0]}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors"
              style={{ color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}
              title="Sign out"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        )}
      </header>

      {/* Body */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <nav className="sidebar hidden md:flex">
          <div className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2 px-2"
              style={{ color: 'var(--color-muted)' }}>
              Navigation
            </p>
            <SidebarLink to="/dashboard" icon={<LayoutDashboard size={15} />} label="Dashboard" />
          </div>
          <div className="mt-auto pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2 px-2"
              style={{ color: 'var(--color-muted)' }}>
              Account
            </p>
            {user && (
              <div className="px-2 py-2">
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{user.name}</p>
                <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{user.email}</p>
              </div>
            )}
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 min-w-0 overflow-auto">
          {children}
        </main>
      </div>
      <CommandPalette isOpen={showSearch} onClose={() => setShowSearch(false)} />
    </div>
  );
}

function SidebarLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-[var(--color-surface-strong)]"
      style={{ color: 'var(--color-soft)' }}
    >
      <span style={{ color: 'var(--color-muted)' }}>{icon}</span>
      {label}
    </Link>
  );
}
