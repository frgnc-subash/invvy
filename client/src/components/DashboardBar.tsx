import { useEffect, useState } from 'react';
import { Archive, Bell, Eye, Moon, Sun } from 'lucide-react';
import { archiveNotification, getNotifications, markNotificationRead } from '../api';
import { Button } from './ui/button';
import type { Notification as AppNotification } from '../types';

function formatNotificationTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function DashboardBar() {
  const [activeNotifications, setActiveNotifications] = useState<AppNotification[]>([]);
  const [archivedNotifications, setArchivedNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'active' | 'archived'>('active');
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('invvy-theme');
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('invvy-theme', theme);
  }, [theme]);

  const loadNotifications = async () => {
    try {
      const [activeData, archivedData] = await Promise.all([
        getNotifications(false),
        getNotifications(true),
      ]);
      setActiveNotifications(activeData);
      setArchivedNotifications(archivedData);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleRead = async (id: string) => {
    await markNotificationRead(id);
    await loadNotifications();
  };

  const handleArchive = async (id: string) => {
    await archiveNotification(id);
    await loadNotifications();
  };

  const unreadCount = activeNotifications.filter((n) => !n.is_read).length;
  const notifications = view === 'active' ? activeNotifications : archivedNotifications;

  return (
    <div className="relative flex flex-wrap items-center gap-2">
      <Button
        type="button"
        onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
        variant="outline"
        size="icon"
        aria-label="Toggle theme"
        title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      >
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </Button>

      <Button
        type="button"
        onClick={() => setOpen((current) => !current)}
        variant="outline"
        size="icon"
        aria-label="Notifications"
        title="Notifications"
        className="relative"
      >
        <Bell size={16} />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-semibold leading-none text-white">
            {unreadCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="absolute right-0 top-11 z-20 w-[min(92vw,24rem)] overflow-hidden rounded-lg border border-stone-200 bg-white shadow-xl shadow-stone-300/50 dark:border-stone-800 dark:bg-neutral-950 dark:shadow-black/50">
          <div className="flex border-b border-stone-200 p-1 dark:border-stone-800">
            {(['active', 'archived'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setView(tab)}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium capitalize transition-colors ${
                  view === tab
                    ? 'bg-blue-100 text-blue-900 dark:bg-neutral-800 dark:text-white'
                    : 'text-stone-500 hover:bg-stone-50 dark:text-stone-400 dark:hover:bg-neutral-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="max-h-96 overflow-y-auto p-2">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-950"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-stone-950 dark:text-stone-100">{notification.title}</p>
                      <p className="mt-1 text-sm leading-5 text-stone-600 dark:text-stone-400">{notification.message}</p>
                      <p className="mt-2 text-xs text-stone-500 dark:text-stone-500">
                        {formatNotificationTime(notification.created_at)}
                      </p>
                    </div>
                    {!notification.is_read ? (
                      <span className="mt-1 h-2 w-2 rounded-full bg-blue-600" aria-label="Unread" />
                    ) : null}
                  </div>
                  {view === 'active' ? (
                    <div className="mt-3 flex gap-2">
                      {!notification.is_read ? (
                        <button
                          type="button"
                          onClick={() => handleRead(notification.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
                        >
                          <Eye size={14} />
                          Read
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleArchive(notification.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
                      >
                        <Archive size={14} />
                        Archive
                      </button>
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-sm text-stone-500 dark:text-stone-400">
                No {view} notifications.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
