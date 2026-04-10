import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../contexts';
import type { Notification } from '../../types';

interface NotificationDropdownProps {
  variant?: 'default' | 'zesty' | 'platforma';
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ variant = 'default' }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotification();
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isZestyVariant = variant === 'zesty';
  const isPlatformaVariant = variant === 'platforma';

  const bellButtonClass = isZestyVariant
    ? 'relative p-2 text-on-surface-variant hover:text-primary transition-colors'
    : isPlatformaVariant
      ? 'relative p-2 text-white/80 hover:text-white transition-colors'
    : 'relative p-2 text-gray-600 hover:text-gray-900 transition-colors';

  const markAllClass = isZestyVariant
    ? 'text-sm text-primary hover:text-surface-tint font-medium transition-colors'
    : isPlatformaVariant
      ? 'text-sm text-[#c7d39f] hover:text-[#e4edc6] font-medium transition-colors'
    : 'text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors';

  const unreadItemClass = isZestyVariant
    ? 'bg-primary-fixed/45 hover:bg-primary-fixed/70'
    : isPlatformaVariant
      ? 'bg-white/10 hover:bg-white/15'
    : 'bg-blue-50 hover:bg-blue-100';

  const unreadDotClass = isZestyVariant
    ? 'w-2 h-2 bg-primary rounded-full mt-1 ml-2 flex-shrink-0'
    : isPlatformaVariant
      ? 'w-2 h-2 bg-[#c7d39f] rounded-full mt-1 ml-2 flex-shrink-0'
    : 'w-2 h-2 bg-blue-600 rounded-full mt-1 ml-2 flex-shrink-0';

  const dropdownClass = isPlatformaVariant
    ? 'absolute right-0 mt-2 w-80 rounded-lg border border-white/15 bg-[rgba(17,21,27,0.96)] shadow-[0_18px_32px_rgba(0,0,0,0.45)] z-50 backdrop-blur-md'
    : 'absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50 border border-gray-200';

  const dropdownHeaderClass = isPlatformaVariant
    ? 'p-4 border-b border-white/15 flex justify-between items-center'
    : 'p-4 border-b flex justify-between items-center';

  const dropdownTitleClass = isPlatformaVariant
    ? 'font-semibold text-white'
    : 'font-semibold text-gray-900';

  const emptyStateClass = isPlatformaVariant
    ? 'p-8 text-center text-white/70'
    : 'p-8 text-center text-gray-500';

  const emptyIconClass = isPlatformaVariant
    ? 'w-12 h-12 mx-auto mb-3 text-white/40'
    : 'w-12 h-12 mx-auto mb-3 text-gray-400';

  const readItemClass = isPlatformaVariant
    ? 'bg-transparent hover:bg-white/8'
    : 'bg-white hover:bg-gray-50';

  const itemTitleClass = isPlatformaVariant
    ? 'font-medium text-sm text-white'
    : 'font-medium text-sm text-gray-900';

  const itemMessageClass = isPlatformaVariant
    ? 'text-sm text-white/70 mt-1'
    : 'text-sm text-gray-600 mt-1';

  const itemDateClass = isPlatformaVariant
    ? 'text-xs text-white/50 mt-2'
    : 'text-xs text-gray-500 mt-2';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    // Close dropdown
    setShowDropdown(false);
    
    // Navigate to related item if needed
    if (notification.related_type === 'order' && notification.related_id) {
      navigate(`/zesty/orders/${notification.related_id}`);
    } else if (notification.related_type === 'booking' && notification.related_id) {
      navigate(`/eventra/bookings/${notification.related_id}`);
    } else if (notification.related_type === 'event' && notification.related_id) {
      navigate(`/eventra/events/${notification.related_id}`);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={bellButtonClass}
        aria-label="Notifications"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className={dropdownClass}>
          <div className={dropdownHeaderClass}>
            <h3 className={dropdownTitleClass}>Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className={markAllClass}
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className={emptyStateClass}>
                <svg
                  className={emptyIconClass}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
                <p>No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 border-b cursor-pointer transition ${
                    notification.is_read ? readItemClass : unreadItemClass
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className={itemTitleClass}>{notification.title}</h4>
                      <p className={itemMessageClass}>{notification.message}</p>
                      <p className={itemDateClass}>
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div className={unreadDotClass}></div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
