import { Briefcase, CalendarSearch, LayoutDashboard, Ticket, UserRound, UtensilsCrossed } from 'lucide-react';
import type { DashNavGroup } from './DashboardShell';
import type { User } from '../../types';

/** Customer hub navigation, shared by the overview, the two vertical pages and profile. */
export const customerNav: DashNavGroup[] = [
  {
    label: 'You',
    items: [
      { key: 'overview', label: 'Overview', icon: LayoutDashboard, to: '/dashboard' },
      { key: 'zesty', label: 'Food orders', icon: UtensilsCrossed, to: '/dashboard/zesty' },
      { key: 'eventra', label: 'Event tickets', icon: Ticket, to: '/dashboard/eventra' },
      { key: 'profile', label: 'Profile', icon: UserRound, to: '/profile' },
    ],
  },
  {
    label: 'Explore',
    items: [
      { key: 'order-food', label: 'Order food', icon: UtensilsCrossed, to: '/zesty' },
      { key: 'find-events', label: 'Find events', icon: CalendarSearch, to: '/eventra/events' },
    ],
  },
];

const BUSINESS_HOME: Partial<Record<User['role'], { to: string; label: string }>> = {
  restaurant_owner: { to: '/dashboard/restaurant-owner', label: 'Partner workspace' },
  event_organizer: { to: '/dashboard/event-organizer', label: 'Organizer studio' },
  admin: { to: '/dashboard/admin', label: 'Operations console' },
};

/** Navigation for the profile page, which every role can reach. */
export const navForRole = (role?: User['role']): DashNavGroup[] => {
  const business = role ? BUSINESS_HOME[role] : undefined;
  if (!business) return customerNav;
  return [
    {
      label: 'Workspace',
      items: [
        { key: 'workspace', label: business.label, icon: Briefcase, to: business.to },
        { key: 'profile', label: 'Profile', icon: UserRound, to: '/profile' },
      ],
    },
  ];
};
