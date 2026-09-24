import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, CheckCheck } from 'lucide-react';
import { useNotification } from '../../contexts';
import type { Notification } from '../../types';

interface NotificationDropdownProps {
  /** 'zesty' = light with red accent, 'default' = light Platforma, 'platforma' = dark (dashboards, Eventra). */
  variant?: 'default' | 'zesty' | 'platforma';
}

/** "Just now", "12 min ago", "3 h ago", "Yesterday", then an Indian-format date. */
const relativeTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  if (hours < 48) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
};

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ variant = 'default' }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotification();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const dark = variant === 'platforma';
  const accent = variant === 'zesty' ? 'text-zesty-redDark' : dark ? 'text-[#e8824a]' : 'text-[#56652f]';
  const dot = variant === 'zesty' ? 'bg-zesty-red' : dark ? 'bg-[#e8824a]' : 'bg-[#6f7f42]';

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openNotification = async (notification: Notification) => {
    if (!notification.is_read) await markAsRead(notification.id);
    setOpen(false);
    if (notification.related_type === 'order' && notification.related_id) navigate(`/zesty/orders/${notification.related_id}`);
    else if (notification.related_type === 'booking' && notification.related_id) navigate(`/eventra/bookings/${notification.related_id}`);
    else if (notification.related_type === 'event' && notification.related_id) navigate(`/eventra/events/${notification.related_id}`);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="true"
        className={`relative grid h-10 w-10 place-items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 ${
          dark ? 'text-white/80 hover:bg-white/10 hover:text-white focus-visible:ring-white/50' : 'text-[#4a4943] hover:bg-black/[0.05] hover:text-[#141414] focus-visible:ring-[#6f7f42]/50'
        }`}
      >
        <Bell className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#e23744] px-1 text-[10px] font-bold text-white tabular-nums">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.35)] ${
            dark ? 'border border-white/10 bg-[#141414] text-[#f5f0e8]' : 'border border-[#e6e2d8] bg-white text-[#141414]'
          }`}
        >
          <div className={`flex items-center justify-between border-b px-4 py-3 ${dark ? 'border-white/[0.08]' : 'border-[#efece4]'}`}>
            <p className="font-semibold">Notifications</p>
            {unreadCount > 0 && (
              <button type="button" onClick={() => void markAllAsRead()} className={`inline-flex items-center gap-1 text-xs font-semibold hover:underline ${accent}`}>
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className={`flex flex-col items-center px-6 py-10 text-center text-sm ${dark ? 'text-white/60' : 'text-[#6b6a63]'}`}>
                <BellOff className="mb-3 h-8 w-8 opacity-50" strokeWidth={1.5} aria-hidden="true" />
                You're all caught up. Order and booking updates will show up here.
              </div>
            ) : (
              <ul>
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => void openNotification(notification)}
                      className={`flex w-full gap-3 px-4 py-3 text-left transition-colors ${
                        dark ? 'hover:bg-white/[0.05]' : 'hover:bg-[#f6f4ee]'
                      } ${!notification.is_read ? (dark ? 'bg-white/[0.03]' : 'bg-[#faf8f3]') : ''}`}
                    >
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.is_read ? 'bg-transparent' : dot}`} aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm ${notification.is_read ? '' : 'font-semibold'}`}>{notification.title}</span>
                        <span className={`mt-0.5 block text-sm ${dark ? 'text-white/65' : 'text-[#6b6a63]'}`}>{notification.message}</span>
                        <span className={`mt-1 block text-xs ${dark ? 'text-white/40' : 'text-[#9c9a90]'}`}>{relativeTime(notification.created_at)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
