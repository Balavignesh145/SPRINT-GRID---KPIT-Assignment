import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, CheckCheck, Bell } from 'lucide-react';
import { notifications as notifApi } from '../../api/client';
import type { Notification } from '../../types';

interface NotificationPanelProps {
  notifications: Notification[];
  onClose: () => void;
}

export function NotificationPanel({ notifications: notifs, onClose }: NotificationPanelProps) {
  const qc = useQueryClient();

  const markRead = useMutation({
    mutationFn: (id: string) => notifApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] })
  });

  const markAll = useMutation({
    mutationFn: () => notifApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] })
  });

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="absolute right-0 top-10 z-50 w-80 rounded-xl shadow-2xl overflow-hidden"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)'
        }}
      >
        <div className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <Bell size={14} style={{ color: 'var(--color-brand)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              Notifications
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => markAll.mutate()}
              className="text-[11px] flex items-center gap-1 px-2 py-1 rounded-md transition-colors"
              style={{ color: 'var(--color-muted)', background: 'var(--color-surface-strong)' }}
            >
              <CheckCheck size={11} /> Mark all read
            </button>
            <button onClick={onClose} style={{ color: 'var(--color-muted)' }}>
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {notifs.length === 0 ? (
            <div className="py-8 flex flex-col items-center gap-2">
              <Bell size={24} style={{ color: 'var(--color-muted)', opacity: 0.4 }} />
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>No notifications</p>
            </div>
          ) : (
            notifs.map((n) => (
              <div
                key={n.id}
                className="px-4 py-3 flex gap-3 transition-colors hover:bg-[var(--color-surface-strong)] cursor-pointer"
                style={{ borderBottom: '1px solid var(--color-border)', opacity: n.readAt ? 0.6 : 1 }}
                onClick={() => { if (!n.readAt) markRead.mutate(n.id); }}
              >
                <div className="mt-0.5 shrink-0">
                  {!n.readAt && (
                    <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-brand)' }} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                    {n.title}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                    {n.body.substring(0, 80)}{n.body.length > 80 ? '…' : ''}
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--color-muted)', opacity: 0.7 }}>
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
