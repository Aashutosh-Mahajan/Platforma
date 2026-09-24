import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bike,
  ChartNoAxesCombined,
  ChefHat,
  Clock,
  Equal,
  ExternalLink,
  Flame,
  IndianRupee,
  LayoutDashboard,
  MapPin,
  Minus,
  Pencil,
  Plus,
  Power,
  ReceiptText,
  Search,
  Star,
  Store,
  TicketPercent,
  Trash2,
  UserRound,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../../contexts';
import { restaurantAPI, menuItemAPI, orderAPI, promotionAPI } from '../../api/zesty';
import type { Promotion, PromotionCreateData, EarningsSummary } from '../../api/zesty';
import type { Restaurant, MenuItem, Order } from '../../types';
import { DashboardShell, type DashNavGroup } from '../../components/dashboard/DashboardShell';
import {
  AreaChart,
  DashModal,
  EmptyState,
  ErrorBanner,
  Field,
  KpiLedger,
  Panel,
  RankedBars,
  SectionHeading,
  Segmented,
  SkeletonRows,
  StatusBreakdown,
  StatusPill,
} from '../../components/dashboard/primitives';
import {
  bucketByDay,
  formatDate,
  formatINR,
  formatInt,
  greeting,
  humanize,
  shortRef,
  themes,
  toNumber,
} from '../../components/dashboard/theme';
import { fallbackFoodImage, ZESTY_HERO_IMAGES } from '../../utils/foodImagery';
import ZestyAnalyticsView from './analytics/ZestyAnalyticsView';

interface RestaurantFormData {
  name: string;
  description: string;
  cuisine_types: string;
  address: string;
  phone: string;
  delivery_fee: number;
  delivery_time_min: number;
  delivery_time_max: number;
}

interface MenuItemFormData {
  name: string;
  description: string;
  price: number;
  category: string;
  is_vegetarian: boolean;
  is_vegan: boolean;
}

interface Analytics {
  totalOrders: number;
  revenue: number;
  averageRating: number;
}

export const RestaurantOwnerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [analytics, setAnalytics] = useState<Analytics>({ totalOrders: 0, revenue: 0, averageRating: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'restaurants' | 'menu' | 'orders' | 'promotions' | 'earnings'>('overview');
  const [orderFilter, setOrderFilter] = useState<'active' | 'delivered' | 'cancelled' | 'all'>('active');
  const [menuQuery, setMenuQuery] = useState('');

  // Modal states
  const [showRestaurantModal, setShowRestaurantModal] = useState(false);
  const [showMenuItemModal, setShowMenuItemModal] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);

  // Form states
  const [restaurantForm, setRestaurantForm] = useState<RestaurantFormData>({
    name: '',
    description: '',
    cuisine_types: '',
    address: '',
    phone: '',
    delivery_fee: 0,
    delivery_time_min: 20,
    delivery_time_max: 40,
  });

  const [menuItemForm, setMenuItemForm] = useState<MenuItemFormData>({
    name: '',
    description: '',
    price: 0,
    category: '',
    is_vegetarian: false,
    is_vegan: false,
  });

  const [promoForm, setPromoForm] = useState({
    code: '',
    description: '',
    discount_type: 'percent' as 'percent' | 'fixed',
    discount_value: 10,
    min_order_value: 0,
    max_discount_amount: '' as number | '',
    usage_limit: '' as number | '',
  });

  useEffect(() => {
    loadRestaurants();
  }, []);

  useEffect(() => {
    if (selectedRestaurant) {
      loadMenuItems();
      loadOrders();
      loadPromotions();
      loadEarnings();
    }
  }, [selectedRestaurant?.id]);

  useEffect(() => {
    calculateAnalytics();
  }, [orders, selectedRestaurant?.id]);

  useEffect(() => {
    if (!selectedRestaurant) return;
    if (activeTab !== 'orders' && activeTab !== 'overview') return;

    const intervalId = window.setInterval(() => {
      loadOrders();
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [selectedRestaurant?.id, activeTab]);

  const loadRestaurants = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await restaurantAPI.list({ page: 1 });
      setRestaurants(data.results);
      if (data.results.length > 0) {
        setSelectedRestaurant(data.results[0]);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load restaurants');
    } finally {
      setLoading(false);
    }
  };

  const loadMenuItems = async () => {
    if (!selectedRestaurant) return;
    try {
      const data = await restaurantAPI.getMenu(selectedRestaurant.id, {});
      setMenuItems(data.results);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load menu items');
    }
  };

  const loadOrders = async () => {
    if (!selectedRestaurant) return;

    try {
      const data = await orderAPI.list();
      // Filter orders for selected restaurant
      const restaurantOrders = data.results.filter(
        (order) => order.restaurant === selectedRestaurant.id
      );
      setOrders(restaurantOrders);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load orders');
    }
  };

  const loadPromotions = async () => {
    if (!selectedRestaurant) return;
    try {
      const data = await promotionAPI.list(selectedRestaurant.id);
      setPromotions(data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.response?.data?.detail || 'Failed to load promotions');
    }
  };

  const loadEarnings = async () => {
    if (!selectedRestaurant) return;
    try {
      const data = await restaurantAPI.getEarnings(selectedRestaurant.id);
      setEarnings(data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.response?.data?.detail || 'Failed to load earnings');
    }
  };

  const resetPromoForm = () => {
    setPromoForm({
      code: '', description: '', discount_type: 'percent', discount_value: 10,
      min_order_value: 0, max_discount_amount: '', usage_limit: '',
    });
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurant) return;

    const payload: PromotionCreateData = {
      restaurant: selectedRestaurant.id,
      code: promoForm.code,
      description: promoForm.description,
      discount_type: promoForm.discount_type,
      discount_value: promoForm.discount_value,
      min_order_value: promoForm.min_order_value,
      max_discount_amount: promoForm.max_discount_amount === '' ? null : promoForm.max_discount_amount,
      usage_limit: promoForm.usage_limit === '' ? null : promoForm.usage_limit,
    };

    try {
      const newPromo = await promotionAPI.create(payload);
      setPromotions([newPromo, ...promotions]);
      setShowPromoModal(false);
      resetPromoForm();
    } catch (err: any) {
      setError(err.response?.data?.error?.details?.[0]?.message || err.response?.data?.error?.message || 'Failed to create promo code');
    }
  };

  const handleTogglePromoActive = async (promo: Promotion) => {
    try {
      const updated = await promotionAPI.update(promo.id, { is_active: !promo.is_active });
      setPromotions(promotions.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update promo code');
    }
  };

  const handleDeletePromo = async (id: number) => {
    if (!confirm('Delete this promo code? This cannot be undone.')) return;
    try {
      await promotionAPI.delete(id);
      setPromotions(promotions.filter((p) => p.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to delete promo code');
    }
  };

  const calculateAnalytics = () => {
    if (!selectedRestaurant) return;

    const restaurantOrders = orders.filter(
      (order) => order.restaurant === selectedRestaurant.id && order.status !== 'cancelled'
    );

    const totalOrders = restaurantOrders.length;
    const revenue = restaurantOrders.reduce((sum, order) => sum + parseFloat(order.total.toString()), 0);
    const averageRating = parseFloat(selectedRestaurant.rating.toString()) || 0;
    
    setAnalytics({ totalOrders, revenue, averageRating });
  };

  const handleCreateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newRestaurant = await restaurantAPI.create(restaurantForm);
      setRestaurants([...restaurants, newRestaurant]);
      setShowRestaurantModal(false);
      resetRestaurantForm();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create restaurant');
    }
  };

  const handleUpdateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRestaurant) return;
    
    try {
      const updated = await restaurantAPI.update(editingRestaurant.id, restaurantForm);
      setRestaurants(restaurants.map((r) => (r.id === updated.id ? updated : r)));
      if (selectedRestaurant?.id === updated.id) {
        setSelectedRestaurant(updated);
      }
      setShowRestaurantModal(false);
      setEditingRestaurant(null);
      resetRestaurantForm();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update restaurant');
    }
  };

  const handleToggleRestaurantActive = async (restaurant: Restaurant) => {
    try {
      const updated = await restaurantAPI.toggleActive(restaurant.id);
      setRestaurants(restaurants.map((r) => (r.id === updated.id ? updated : r)));
      if (selectedRestaurant?.id === updated.id) {
        setSelectedRestaurant(updated);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to toggle restaurant status');
    }
  };

  const handleCreateMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurant) return;
    
    try {
      const newItem = await menuItemAPI.create({
        ...menuItemForm,
        restaurant: selectedRestaurant.id,
      });
      setMenuItems([...menuItems, newItem]);
      setShowMenuItemModal(false);
      resetMenuItemForm();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create menu item');
    }
  };

  const handleUpdateMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMenuItem) return;
    
    try {
      const updated = await menuItemAPI.update(editingMenuItem.id, menuItemForm);
      setMenuItems(menuItems.map((item) => (item.id === updated.id ? updated : item)));
      setShowMenuItemModal(false);
      setEditingMenuItem(null);
      resetMenuItemForm();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update menu item');
    }
  };

  const handleDeleteMenuItem = async (id: number) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return;
    
    try {
      await menuItemAPI.delete(id);
      setMenuItems(menuItems.filter((item) => item.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete menu item');
    }
  };

  const handleToggleMenuItemAvailable = async (item: MenuItem) => {
    try {
      const updated = await menuItemAPI.toggleAvailable(item.id);
      setMenuItems(menuItems.map((i) => (i.id === updated.id ? updated : i)));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to toggle menu item availability');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string | number, newStatus: string) => {
    try {
      const updated = await orderAPI.updateStatus(orderId, newStatus);
      setOrders(orders.map((order) => (order.id === updated.id ? updated : order)));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update order status');
    }
  };

  const openCreateRestaurantModal = () => {
    resetRestaurantForm();
    setEditingRestaurant(null);
    setShowRestaurantModal(true);
  };

  const openEditRestaurantModal = (restaurant: Restaurant) => {
    setRestaurantForm({
      name: restaurant.name,
      description: restaurant.description,
      cuisine_types: restaurant.cuisine_types,
      address: restaurant.address,
      phone: restaurant.phone,
      delivery_fee: restaurant.delivery_fee,
      delivery_time_min: restaurant.delivery_time_min,
      delivery_time_max: restaurant.delivery_time_max,
    });
    setEditingRestaurant(restaurant);
    setShowRestaurantModal(true);
  };

  const openCreateMenuItemModal = () => {
    resetMenuItemForm();
    setEditingMenuItem(null);
    setShowMenuItemModal(true);
  };

  const openEditMenuItemModal = (item: MenuItem) => {
    setMenuItemForm({
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      is_vegetarian: item.is_vegetarian,
      is_vegan: item.is_vegan,
    });
    setEditingMenuItem(item);
    setShowMenuItemModal(true);
  };

  const resetRestaurantForm = () => {
    setRestaurantForm({
      name: '',
      description: '',
      cuisine_types: '',
      address: '',
      phone: '',
      delivery_fee: 0,
      delivery_time_min: 20,
      delivery_time_max: 40,
    });
  };

  const resetMenuItemForm = () => {
    setMenuItemForm({
      name: '',
      description: '',
      price: 0,
      category: '',
      is_vegetarian: false,
      is_vegan: false,
    });
  };

  const W = 'zesty' as const;
  const t = themes[W];

  const ACTIVE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'];
  const liveOrders = orders.filter((order) => ACTIVE_STATUSES.includes(order.status));
  const statusCounts = orders.reduce<Record<string, number>>((acc, order) => {
    acc[order.status] = (acc[order.status] ?? 0) + 1;
    return acc;
  }, {});
  const revenueSeries = bucketByDay(
    orders.filter((order) => order.status !== 'cancelled'),
    (order) => order.created_at,
    (order) => toNumber(order.total)
  );
  const seriesTotal = revenueSeries.reduce((sum, point) => sum + point.value, 0);
  const bestSellers = Object.values(
    orders
      .filter((order) => order.status !== 'cancelled')
      .flatMap((order) => order.items)
      .reduce<Record<string, { label: string; value: number; qty: number }>>((acc, item) => {
        const name = item.menu_item?.name || 'Menu item';
        acc[name] = acc[name] ?? { label: name, value: 0, qty: 0 };
        acc[name].value += toNumber(item.total);
        acc[name].qty += toNumber(item.quantity);
        return acc;
      }, {})
  )
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map((entry) => ({ label: entry.label, value: entry.value, sub: `${formatInt(entry.qty)} sold` }));

  const filteredOrders = [...orders]
    .filter((order) =>
      orderFilter === 'all'
        ? true
        : orderFilter === 'active'
          ? ACTIVE_STATUSES.includes(order.status)
          : order.status === orderFilter
    )
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

  const query = menuQuery.trim().toLowerCase();
  const visibleMenu = menuItems.filter(
    (item) => !query || `${item.name} ${item.category} ${item.description}`.toLowerCase().includes(query)
  );
  const menuByCategory = visibleMenu.reduce<Record<string, MenuItem[]>>((acc, item) => {
    const key = item.category || 'Uncategorised';
    (acc[key] = acc[key] ?? []).push(item);
    return acc;
  }, {});

  const restaurantImage = (restaurant?: Restaurant | null) =>
    restaurant?.image_url || restaurant?.banner || restaurant?.image || fallbackFoodImage(restaurant?.id ?? 0);

  const needsKitchen = !selectedRestaurant;
  const nav: DashNavGroup[] = [
    {
      label: 'Kitchen',
      items: [
        { key: 'overview', label: 'Overview', icon: LayoutDashboard, onClick: () => setActiveTab('overview'), disabled: needsKitchen },
        { key: 'analytics', label: 'Analytics', icon: ChartNoAxesCombined, onClick: () => setActiveTab('analytics'), disabled: needsKitchen },
        { key: 'orders', label: 'Orders', icon: ReceiptText, onClick: () => setActiveTab('orders'), disabled: needsKitchen, badge: liveOrders.length || undefined },
        { key: 'menu', label: 'Menu', icon: UtensilsCrossed, onClick: () => setActiveTab('menu'), disabled: needsKitchen },
        { key: 'promotions', label: 'Promotions', icon: TicketPercent, onClick: () => setActiveTab('promotions'), disabled: needsKitchen },
        { key: 'earnings', label: 'Earnings', icon: Wallet, onClick: () => setActiveTab('earnings'), disabled: needsKitchen },
      ],
    },
    {
      label: 'Business',
      items: [
        { key: 'restaurants', label: 'Restaurants', icon: Store, onClick: () => setActiveTab('restaurants'), badge: restaurants.length > 1 ? restaurants.length : undefined },
        { key: 'profile', label: 'Profile', icon: UserRound, to: '/profile' },
      ],
    },
  ];

  const switcher =
    restaurants.length > 1 ? (
      <div className="px-3">
        <label htmlFor="kitchen-switch" className={`block px-0 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] ${t.sidebarMuted}`}>
          Switch kitchen
        </label>
        <select
          id="kitchen-switch"
          value={selectedRestaurant?.id ?? ''}
          onChange={(e) => {
            const next = restaurants.find((r) => r.id === Number(e.target.value));
            if (next) setSelectedRestaurant(next);
          }}
          className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white focus:border-zesty-red focus:outline-none [&>option]:text-[#1c1c1c]"
        >
          {restaurants.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
    ) : null;

  const statusSelect = (order: Order) => {
    const options = ['confirmed', 'preparing', 'ready'];
    if (!options.includes(order.status)) options.unshift(order.status);
    return (
      <select
        aria-label={`Update status for order ${order.id}`}
        value={order.status}
        onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
        className={`${t.input} !w-auto !rounded-full !py-1.5 pr-8 font-semibold`}
      >
        {options.map((status) => (
          <option key={status} value={status} disabled={!['confirmed', 'preparing', 'ready'].includes(status)}>
            {humanize(status)}
          </option>
        ))}
      </select>
    );
  };

  const VegMark: React.FC<{ vegan?: boolean }> = ({ vegan }) => (
    <span
      title={vegan ? 'Vegan' : 'Vegetarian'}
      className="inline-grid h-3.5 w-3.5 shrink-0 place-items-center rounded-[3px] border-[1.5px] border-[#1fa463]"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-[#1fa463]" />
      <span className="sr-only">{vegan ? 'Vegan' : 'Vegetarian'}</span>
    </span>
  );

  const closeRestaurantModal = () => {
    setShowRestaurantModal(false);
    setEditingRestaurant(null);
    resetRestaurantForm();
  };
  const closeMenuModal = () => {
    setShowMenuItemModal(false);
    setEditingMenuItem(null);
    resetMenuItemForm();
  };

  const firstName = user?.first_name || 'chef';

  return (
    <DashboardShell
      world={W}
      context="Partner workspace"
      nav={nav}
      activeKey={activeTab}
      sidebarExtra={switcher}
      image={selectedRestaurant ? restaurantImage(selectedRestaurant) : ZESTY_HERO_IMAGES[0]}
      title={
        <>
          {greeting()}, <span className={t.titleAccent}>{firstName}</span>
        </>
      }
      subtitle={
        selectedRestaurant ? (
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold text-white">{selectedRestaurant.name}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{selectedRestaurant.area || selectedRestaurant.address}</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden="true" />{selectedRestaurant.delivery_time_min}–{selectedRestaurant.delivery_time_max} min</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${selectedRestaurant.is_active ? 'bg-[#1fa463]/25 text-[#9ff0c4]' : 'bg-white/15 text-white/80'}`}>
              {selectedRestaurant.is_active ? 'Accepting orders' : 'Paused'}
            </span>
          </span>
        ) : (
          'Set up your first kitchen to start taking orders on Zesty.'
        )
      }
      actions={
        selectedRestaurant ? (
          <>
            <Link to={`/zesty/restaurants/${selectedRestaurant.id}`} className={t.btnOnImage}>
              <ExternalLink className="h-4 w-4" aria-hidden="true" /> Storefront
            </Link>
            <button type="button" onClick={() => { setActiveTab('menu'); openCreateMenuItemModal(); }} className={t.btnOnImagePrimary}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Menu item
            </button>
          </>
        ) : (
          <button type="button" onClick={openCreateRestaurantModal} className={t.btnOnImagePrimary}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Add restaurant
          </button>
        )
      }
      ledger={
        activeTab === 'analytics' ? undefined : <KpiLedger
          world={W}
          loading={loading}
          items={[
            { label: 'Revenue', icon: IndianRupee, value: formatINR(analytics.revenue), hint: `${formatINR(seriesTotal)} in the charted 14 days` },
            { label: 'Orders', icon: ReceiptText, value: formatInt(analytics.totalOrders), hint: `${statusCounts.delivered ?? 0} delivered` },
            { label: 'In the kitchen', icon: Flame, value: formatInt(liveOrders.length), hint: liveOrders.length ? 'Needs attention' : 'All caught up' },
            {
              label: 'Rating',
              icon: Star,
              value: selectedRestaurant && selectedRestaurant.review_count > 0 ? analytics.averageRating.toFixed(1) : 'New',
              hint: selectedRestaurant
                ? selectedRestaurant.review_count > 0
                  ? `${formatInt(selectedRestaurant.review_count)} reviews`
                  : 'No reviews yet'
                : undefined,
            },
          ]}
        />
      }
    >
      {error && <ErrorBanner world={W} message={error} onRetry={loadRestaurants} onDismiss={() => setError(null)} />}

      {loading ? (
        <Panel world={W}>
          <SkeletonRows world={W} rows={5} />
        </Panel>
      ) : !selectedRestaurant && activeTab !== 'restaurants' ? (
        <Panel world={W}>
          <EmptyState
            world={W}
            icon={ChefHat}
            title="No kitchen yet"
            body="Add your restaurant with its cuisine, address and delivery times. Once it's live, orders, menu and earnings show up here."
            action={
              <button type="button" onClick={openCreateRestaurantModal} className={t.btnPrimary}>
                <Plus className="h-4 w-4" aria-hidden="true" /> Add restaurant
              </button>
            }
          />
        </Panel>
      ) : null}

      {/* Overview */}
      {!loading && activeTab === 'overview' && selectedRestaurant && (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-3">
            <Panel
              world={W}
              className="xl:col-span-2"
              title="Revenue"
              description={`${revenueSeries[0]?.label} – ${revenueSeries[revenueSeries.length - 1]?.label} · ${formatINR(seriesTotal)} from non-cancelled orders`}
            >
              <AreaChart world={W} data={revenueSeries} ariaLabel="Daily revenue" format={(v) => `₹${new Intl.NumberFormat('en-IN', { notation: 'compact' }).format(v)}`} />
            </Panel>
            <Panel world={W} title="Order mix" description={`${orders.length} orders all time`}>
              <StatusBreakdown world={W} counts={statusCounts} />
              <dl className={`mt-6 grid grid-cols-2 gap-4 border-t pt-5 text-sm ${t.hairline}`}>
                <div>
                  <dt className={t.muted}>Delivery fee</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums">{formatINR(selectedRestaurant.delivery_fee, true)}</dd>
                </div>
                <div>
                  <dt className={t.muted}>Delivery time</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums">{selectedRestaurant.delivery_time_min}–{selectedRestaurant.delivery_time_max} min</dd>
                </div>
                <div>
                  <dt className={t.muted}>Menu items</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums">{menuItems.length}</dd>
                </div>
                <div>
                  <dt className={t.muted}>Live promos</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums">{promotions.filter((p) => p.is_active).length}</dd>
                </div>
              </dl>
            </Panel>
          </div>

          <div className="grid gap-6 xl:grid-cols-5">
            <Panel
              world={W}
              flush
              className="xl:col-span-3"
              title="Live queue"
              description="Refreshes every 15 seconds"
              action={
                <button type="button" onClick={() => setActiveTab('orders')} className={t.btnGhost}>
                  All orders <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              }
            >
              {liveOrders.length === 0 ? (
                <EmptyState world={W} compact icon={Bike} title="The pass is clear" body="New orders land here the moment a customer checks out." />
              ) : (
                <ul className={`divide-y ${t.divide}`}>
                  {liveOrders.slice(0, 6).map((order) => (
                    <li key={order.id} className={`flex flex-wrap items-center gap-4 px-5 py-4 sm:px-6 ${t.rowHover}`}>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">
                          Order #{shortRef(order.id)}
                          <span className={`ml-2 text-xs font-normal ${t.muted}`}>{formatDate(order.created_at, true)}</span>
                        </p>
                        <p className={`mt-0.5 truncate text-sm ${t.muted}`}>
                          {order.items.map((item) => `${item.quantity}× ${item.menu_item?.name ?? 'Item'}`).join(', ')}
                        </p>
                      </div>
                      <span className="font-semibold tabular-nums">{formatINR(order.total, true)}</span>
                      {statusSelect(order)}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel world={W} className="xl:col-span-2" title="Best sellers" description="By revenue across all orders">
              {bestSellers.length === 0 ? (
                <EmptyState world={W} compact icon={UtensilsCrossed} title="No sales yet" body="Your top dishes will rank here after the first orders." />
              ) : (
                <RankedBars world={W} data={bestSellers} format={(v) => formatINR(v)} />
              )}
            </Panel>
          </div>
        </div>
      )}

      {/* Analytics */}
      {!loading && activeTab === 'analytics' && selectedRestaurant && (
        <ZestyAnalyticsView mode="restaurant" restaurantId={selectedRestaurant.id} restaurantName={selectedRestaurant.name} />
      )}

      {/* Restaurants */}
      {!loading && activeTab === 'restaurants' && (
        <div>
          <SectionHeading
            world={W}
            title="Your restaurants"
            description="Pick the kitchen you're managing, edit its details or pause it."
            action={
              <button type="button" onClick={openCreateRestaurantModal} className={t.btnPrimary}>
                <Plus className="h-4 w-4" aria-hidden="true" /> Add restaurant
              </button>
            }
          />
          <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
            {restaurants.map((restaurant) => {
              const selected = selectedRestaurant?.id === restaurant.id;
              return (
                <article
                  key={restaurant.id}
                  className={`group overflow-hidden rounded-2xl border bg-white transition-shadow duration-200 ${
                    selected ? 'border-zesty-red shadow-[0_18px_40px_-18px_rgba(226,55,68,0.55)]' : `${t.hairline} hover:shadow-[0_18px_40px_-24px_rgba(40,25,10,0.4)]`
                  }`}
                >
                  <div className="relative h-40 overflow-hidden">
                    <img src={restaurantImage(restaurant)} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    <div className="absolute left-4 top-4">
                      <StatusPill world={W} tone={restaurant.is_active ? 'success' : 'neutral'} label={restaurant.is_active ? 'Live' : 'Paused'} />
                    </div>
                    {selected && (
                      <span className="absolute right-4 top-4 rounded-full bg-zesty-red px-2.5 py-1 text-xs font-semibold text-white">Managing</span>
                    )}
                    <p className="absolute bottom-3 left-4 right-4 inline-flex items-center gap-1 text-sm font-semibold text-white">
                      <Star className="h-4 w-4 fill-zesty-gold text-zesty-gold" aria-hidden="true" />
                      {toNumber(restaurant.rating).toFixed(1)}
                      <span className="font-normal text-white/75">({formatInt(restaurant.review_count)} reviews)</span>
                    </p>
                  </div>
                  <div className="p-5">
                    <h3 className={`${t.display} text-lg`}>{restaurant.name}</h3>
                    <p className={`mt-0.5 text-sm ${t.muted}`}>{restaurant.cuisine_types}</p>
                    <p className={`mt-3 line-clamp-2 text-sm ${t.muted}`}>{restaurant.description}</p>
                    <div className={`mt-4 flex items-center gap-4 text-xs ${t.muted}`}>
                      <span className="inline-flex items-center gap-1"><Bike className="h-3.5 w-3.5" aria-hidden="true" />{formatINR(restaurant.delivery_fee, true)}</span>
                      <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden="true" />{restaurant.delivery_time_min}–{restaurant.delivery_time_max} min</span>
                    </div>
                    <div className={`mt-5 flex items-center gap-2 border-t pt-4 ${t.hairline}`}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRestaurant(restaurant);
                          setActiveTab('overview');
                        }}
                        className={selected ? t.btnSecondary : t.btnPrimary}
                      >
                        {selected ? 'Open overview' : 'Manage'}
                      </button>
                      <button type="button" onClick={() => openEditRestaurantModal(restaurant)} className={t.btnGhost}>
                        <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleRestaurantActive(restaurant)}
                        className={`${restaurant.is_active ? t.btnDanger : t.btnGhost} ml-auto`}
                      >
                        <Power className="h-4 w-4" aria-hidden="true" /> {restaurant.is_active ? 'Pause' : 'Go live'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
            <button
              type="button"
              onClick={openCreateRestaurantModal}
              className={`flex min-h-[320px] flex-col items-center justify-center rounded-2xl border-2 border-dashed ${t.hairline} ${t.muted} transition-colors hover:border-zesty-red hover:text-zesty-redDark`}
            >
              <Plus className="h-8 w-8" strokeWidth={1.5} aria-hidden="true" />
              <span className="mt-3 text-sm font-semibold">Add another restaurant</span>
            </button>
          </div>
        </div>
      )}

      {/* Menu */}
      {!loading && activeTab === 'menu' && selectedRestaurant && (
        <div>
          <SectionHeading
            world={W}
            title="Menu"
            description={`${menuItems.length} dishes · ${menuItems.filter((i) => i.is_available).length} available right now`}
            action={
              <>
                <label className="relative">
                  <span className="sr-only">Search menu</span>
                  <Search className={`pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${t.faint}`} aria-hidden="true" />
                  <input
                    type="search"
                    value={menuQuery}
                    onChange={(e) => setMenuQuery(e.target.value)}
                    placeholder="Search dishes"
                    className={`${t.input} !w-56 !rounded-full pl-10`}
                  />
                </label>
                <button type="button" onClick={openCreateMenuItemModal} className={t.btnPrimary}>
                  <Plus className="h-4 w-4" aria-hidden="true" /> Add dish
                </button>
              </>
            }
          />
          {menuItems.length === 0 ? (
            <Panel world={W}>
              <EmptyState
                world={W}
                icon={UtensilsCrossed}
                title="Your menu is empty"
                body="Add dishes with a price and category. Customers see them on your storefront straight away."
                action={<button type="button" onClick={openCreateMenuItemModal} className={t.btnPrimary}><Plus className="h-4 w-4" aria-hidden="true" /> Add first dish</button>}
              />
            </Panel>
          ) : visibleMenu.length === 0 ? (
            <Panel world={W}>
              <EmptyState world={W} compact icon={Search} title={`Nothing matches “${menuQuery}”`} body="Try a dish name or a category." />
            </Panel>
          ) : (
            <div className="space-y-6">
              {Object.entries(menuByCategory).map(([category, items]) => (
                <Panel key={category} world={W} flush title={category} description={`${items.length} ${items.length === 1 ? 'dish' : 'dishes'}`}>
                  <ul className={`divide-y ${t.divide}`}>
                    {items.map((item) => (
                      <li key={item.id} className={`flex flex-wrap items-center gap-4 px-5 py-4 sm:flex-nowrap sm:px-6 ${t.rowHover}`}>
                        <img
                          src={item.image || fallbackFoodImage(item.id)}
                          alt=""
                          className={`h-14 w-14 shrink-0 rounded-xl object-cover ${item.is_available ? '' : 'grayscale opacity-60'}`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 font-semibold">
                            {(item.is_vegetarian || item.is_vegan) && <VegMark vegan={item.is_vegan} />}
                            <span className="truncate">{item.name}</span>
                            {item.is_vegan && <span className="rounded-full bg-[#1fa463]/10 px-2 py-0.5 text-[11px] font-semibold text-[#15784a]">Vegan</span>}
                          </p>
                          <p className={`mt-0.5 line-clamp-1 text-sm ${t.muted}`}>{item.description}</p>
                        </div>
                        <span className="w-24 text-right font-semibold tabular-nums">{formatINR(item.price, true)}</span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={item.is_available}
                          aria-label={`${item.name} available`}
                          onClick={() => handleToggleMenuItemAvailable(item)}
                          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zesty-red focus-visible:ring-offset-2 ${
                            item.is_available ? 'bg-[#1fa463]' : 'bg-[#e0d3c6]'
                          }`}
                        >
                          <span className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${item.is_available ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                        </button>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => openEditMenuItemModal(item)} className={`${t.btnGhost} !px-2.5`} aria-label={`Edit ${item.name}`}>
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button type="button" onClick={() => handleDeleteMenuItem(item.id)} className={`${t.btnDanger} !px-2.5`} aria-label={`Delete ${item.name}`}>
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Panel>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Orders */}
      {!loading && activeTab === 'orders' && selectedRestaurant && (
        <div>
          <SectionHeading
            world={W}
            title="Orders"
            description="Move orders through the kitchen. The list refreshes every 15 seconds."
            action={
              <Segmented
                world={W}
                label="Filter orders"
                value={orderFilter}
                onChange={setOrderFilter}
                options={[
                  { value: 'active', label: 'Active', count: liveOrders.length },
                  { value: 'delivered', label: 'Delivered', count: statusCounts.delivered ?? 0 },
                  { value: 'cancelled', label: 'Cancelled', count: statusCounts.cancelled ?? 0 },
                  { value: 'all', label: 'All', count: orders.length },
                ]}
              />
            }
          />
          {filteredOrders.length === 0 ? (
            <Panel world={W}>
              <EmptyState
                world={W}
                icon={ReceiptText}
                title={orderFilter === 'active' ? 'No orders in progress' : `No ${orderFilter === 'all' ? '' : orderFilter + ' '}orders`}
                body={orderFilter === 'active' ? 'When a customer checks out, the order appears here with its items and notes.' : 'Try a different filter.'}
              />
            </Panel>
          ) : (
            <div className="grid gap-5 xl:grid-cols-2">
              {filteredOrders.map((order) => (
                <article key={order.id} className={`${t.panel} flex flex-col`}>
                  <header className={`flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4 ${t.hairline}`}>
                    <div>
                      <p className="font-semibold">Order #{shortRef(order.id)}</p>
                      <p className={`text-xs ${t.muted}`}>{formatDate(order.created_at, true)}</p>
                    </div>
                    <StatusPill world={W} status={order.status} />
                  </header>
                  <ul className="flex-1 space-y-2 px-5 py-4 text-sm">
                    {order.items.map((item) => (
                      <li key={item.id} className="flex justify-between gap-3">
                        <span>
                          <span className={`mr-2 font-semibold tabular-nums ${t.accentText}`}>{item.quantity}×</span>
                          {item.menu_item?.name || 'Menu item'}
                        </span>
                        <span className="tabular-nums">{formatINR(item.total, true)}</span>
                      </li>
                    ))}
                  </ul>
                  {order.special_instructions && (
                    <p className="mx-5 mb-4 rounded-xl bg-zesty-gold/15 px-3.5 py-2.5 text-sm text-[#6b4a00]">
                      <span className="font-semibold">Note: </span>
                      {order.special_instructions}
                    </p>
                  )}
                  <footer className={`flex flex-wrap items-end justify-between gap-3 border-t px-5 py-4 ${t.hairline} ${t.subtle} rounded-b-2xl`}>
                    <div className={`text-xs leading-relaxed ${t.muted}`}>
                      Subtotal {formatINR(order.subtotal, true)} · Delivery {formatINR(order.delivery_fee, true)} · Tax {formatINR(order.tax, true)}
                      <p className={`mt-0.5 text-base font-semibold tabular-nums ${t.strong}`}>{formatINR(order.total, true)}</p>
                    </div>
                    {order.status !== 'delivered' && order.status !== 'cancelled' && statusSelect(order)}
                  </footer>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Promotions */}
      {!loading && activeTab === 'promotions' && selectedRestaurant && (
        <div>
          <SectionHeading
            world={W}
            title="Promotions"
            description="Codes customers can apply at checkout for this restaurant."
            action={
              <button type="button" onClick={() => { resetPromoForm(); setShowPromoModal(true); }} className={t.btnPrimary}>
                <Plus className="h-4 w-4" aria-hidden="true" /> New code
              </button>
            }
          />
          {promotions.length === 0 ? (
            <Panel world={W}>
              <EmptyState
                world={W}
                icon={TicketPercent}
                title="No promo codes yet"
                body="A welcome code like WELCOME10 is a simple way to bring first-time customers in."
                action={<button type="button" onClick={() => { resetPromoForm(); setShowPromoModal(true); }} className={t.btnPrimary}><Plus className="h-4 w-4" aria-hidden="true" /> Create a code</button>}
              />
            </Panel>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {promotions.map((promo) => {
                const used = toNumber(promo.times_used);
                const limit = promo.usage_limit != null ? toNumber(promo.usage_limit) : null;
                return (
                  <article key={promo.id} className={`${t.panel} overflow-hidden ${promo.is_active ? '' : 'opacity-75'}`}>
                    <div className={`relative px-5 pb-5 pt-5 ${promo.is_active ? 'bg-[linear-gradient(135deg,#e23744,#b7122a)] text-white' : 'bg-[#efe6dc] text-[#5c5048]'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-mono text-xl font-bold tracking-wider">{promo.code}</p>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${promo.is_active ? 'bg-white/20' : 'bg-black/5'}`}>
                          {promo.is_active ? 'Live' : 'Off'}
                        </span>
                      </div>
                      <p className="mt-4 font-zesty-display text-3xl font-bold">
                        {promo.discount_type === 'percent' ? `${promo.discount_value}% off` : `${formatINR(promo.discount_value)} off`}
                      </p>
                      <p className="mt-1 text-sm opacity-80">{promo.description || 'No description'}</p>
                      <span className="absolute -bottom-3 -left-3 h-6 w-6 rounded-full bg-[#fbf5ee]" aria-hidden="true" />
                      <span className="absolute -bottom-3 -right-3 h-6 w-6 rounded-full bg-[#fbf5ee]" aria-hidden="true" />
                    </div>
                    <div className={`border-t-2 border-dashed px-5 py-4 text-sm ${t.hairline}`}>
                      <dl className="grid grid-cols-2 gap-3">
                        <div>
                          <dt className={`text-xs ${t.muted}`}>Min order</dt>
                          <dd className="font-semibold tabular-nums">{formatINR(promo.min_order_value)}</dd>
                        </div>
                        <div>
                          <dt className={`text-xs ${t.muted}`}>Max discount</dt>
                          <dd className="font-semibold tabular-nums">{promo.max_discount_amount != null ? formatINR(promo.max_discount_amount) : 'No cap'}</dd>
                        </div>
                      </dl>
                      <div className="mt-4">
                        <div className={`flex justify-between text-xs ${t.muted}`}>
                          <span>Redeemed</span>
                          <span className="tabular-nums">{used}{limit != null ? ` / ${limit}` : ' · no limit'}</span>
                        </div>
                        {limit != null && (
                          <div className={`mt-1.5 h-1.5 overflow-hidden rounded-full ${t.subtle}`}>
                            <div className="h-full rounded-full bg-zesty-red" style={{ width: `${Math.min(100, (used / Math.max(1, limit)) * 100)}%` }} />
                          </div>
                        )}
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button type="button" onClick={() => handleTogglePromoActive(promo)} className={t.btnSecondary}>
                          <Power className="h-4 w-4" aria-hidden="true" /> {promo.is_active ? 'Switch off' : 'Switch on'}
                        </button>
                        <button type="button" onClick={() => handleDeletePromo(promo.id)} className={`${t.btnDanger} ml-auto`}>
                          <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Earnings */}
      {!loading && activeTab === 'earnings' && selectedRestaurant && (
        <div className="space-y-6">
          <SectionHeading world={W} title="Earnings" description="What you've earned since your last settled payout, and every payout before it." />
          {!earnings ? (
            <Panel world={W}>
              <SkeletonRows world={W} rows={3} />
            </Panel>
          ) : (
            <>
              <Panel
                world={W}
                title="Current period"
                description={`Since ${formatDate(earnings.unsettled.period_start)} · ${earnings.unsettled.order_count} delivered orders · ${earnings.commission_rate}% commission`}
              >
                <div className="grid items-center gap-6 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
                  <div>
                    <p className={`text-sm ${t.muted}`}>Gross revenue</p>
                    <p className="mt-1 text-3xl font-semibold tabular-nums">{formatINR(earnings.unsettled.gross_revenue, true)}</p>
                  </div>
                  <Minus className={`hidden h-5 w-5 md:block ${t.faint}`} aria-hidden="true" />
                  <div>
                    <p className={`text-sm ${t.muted}`}>Platform commission</p>
                    <p className="mt-1 text-3xl font-semibold tabular-nums text-rose-600">{formatINR(earnings.unsettled.commission_amount, true)}</p>
                  </div>
                  <Equal className={`hidden h-5 w-5 md:block ${t.faint}`} aria-hidden="true" />
                  <div className="rounded-2xl bg-[#17110f] px-5 py-4 text-white">
                    <p className="text-sm text-white/65">Your net earnings</p>
                    <p className="mt-1 text-3xl font-semibold tabular-nums text-zesty-gold">{formatINR(earnings.unsettled.net_amount, true)}</p>
                  </div>
                </div>
                <p className={`mt-5 text-xs ${t.faint}`}>This period isn't settled yet. An admin creates the payout once it's ready to pay.</p>
              </Panel>

              <Panel world={W} flush title="Payout history" description={`${earnings.payouts.length} settled ${earnings.payouts.length === 1 ? 'payout' : 'payouts'}`}>
                {earnings.payouts.length === 0 ? (
                  <EmptyState world={W} compact icon={Wallet} title="No payouts yet" body="Settled periods appear here with their gross, commission and net amounts." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-sm">
                      <thead>
                        <tr className={`text-left text-xs ${t.muted}`}>
                          <th className="px-6 py-3 font-medium">Period</th>
                          <th className="px-3 py-3 text-right font-medium">Orders</th>
                          <th className="px-3 py-3 text-right font-medium">Gross</th>
                          <th className="px-3 py-3 text-right font-medium">Commission</th>
                          <th className="px-3 py-3 text-right font-medium">Net</th>
                          <th className="px-6 py-3 text-right font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y border-t ${t.hairline} ${t.divide}`}>
                        {earnings.payouts.map((p) => (
                          <tr key={p.id} className={t.rowHover}>
                            <td className="px-6 py-3.5">{formatDate(p.period_start)} – {formatDate(p.period_end)}</td>
                            <td className="px-3 py-3.5 text-right tabular-nums">{p.order_count}</td>
                            <td className="px-3 py-3.5 text-right tabular-nums">{formatINR(p.gross_revenue, true)}</td>
                            <td className={`px-3 py-3.5 text-right tabular-nums ${t.muted}`}>{formatINR(p.commission_amount, true)}</td>
                            <td className="px-3 py-3.5 text-right font-semibold tabular-nums">{formatINR(p.net_amount, true)}</td>
                            <td className="px-6 py-3.5 text-right">
                              <StatusPill world={W} status={p.status === 'paid' ? 'paid' : 'pending'} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </>
          )}
        </div>
      )}

      {/* Promo modal */}
      <DashModal world={W} open={showPromoModal} title="New promo code" description={selectedRestaurant ? `For ${selectedRestaurant.name}` : undefined} onClose={() => setShowPromoModal(false)}>
        <form onSubmit={handleCreatePromo} className="space-y-4">
          <Field world={W} label="Code" htmlFor="promo-code" hint="Letters and numbers, e.g. WELCOME10">
            <input id="promo-code" type="text" required value={promoForm.code} onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })} placeholder="WELCOME10" className={`${t.input} font-mono uppercase tracking-wider`} />
          </Field>
          <Field world={W} label="Description" htmlFor="promo-desc">
            <input id="promo-desc" type="text" value={promoForm.description} onChange={(e) => setPromoForm({ ...promoForm, description: e.target.value })} placeholder="10% off your first order" className={t.input} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field world={W} label="Discount type" htmlFor="promo-type">
              <select id="promo-type" value={promoForm.discount_type} onChange={(e) => setPromoForm({ ...promoForm, discount_type: e.target.value as 'percent' | 'fixed' })} className={t.input}>
                <option value="percent">Percent off</option>
                <option value="fixed">Fixed amount off</option>
              </select>
            </Field>
            <Field world={W} label={promoForm.discount_type === 'percent' ? 'Percent (%)' : 'Amount (₹)'} htmlFor="promo-value">
              <input id="promo-value" type="number" required min="0" step="0.01" value={promoForm.discount_value} onChange={(e) => setPromoForm({ ...promoForm, discount_value: Number(e.target.value) })} className={t.input} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field world={W} label="Min order (₹)" htmlFor="promo-min">
              <input id="promo-min" type="number" min="0" step="0.01" value={promoForm.min_order_value} onChange={(e) => setPromoForm({ ...promoForm, min_order_value: Number(e.target.value) })} className={t.input} />
            </Field>
            {promoForm.discount_type === 'percent' && (
              <Field world={W} label="Max discount (₹)" htmlFor="promo-max">
                <input id="promo-max" type="number" min="0" step="0.01" placeholder="No cap" value={promoForm.max_discount_amount} onChange={(e) => setPromoForm({ ...promoForm, max_discount_amount: e.target.value === '' ? '' : Number(e.target.value) })} className={t.input} />
              </Field>
            )}
          </div>
          <Field world={W} label="Usage limit" htmlFor="promo-limit" hint="Leave empty for unlimited redemptions">
            <input id="promo-limit" type="number" min="1" placeholder="Unlimited" value={promoForm.usage_limit} onChange={(e) => setPromoForm({ ...promoForm, usage_limit: e.target.value === '' ? '' : Number(e.target.value) })} className={t.input} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowPromoModal(false)} className={t.btnGhost}>Cancel</button>
            <button type="submit" className={t.btnPrimary}>Create code</button>
          </div>
        </form>
      </DashModal>

      {/* Restaurant modal */}
      <DashModal world={W} size="lg" open={showRestaurantModal} title={editingRestaurant ? 'Edit restaurant' : 'Add a restaurant'} onClose={closeRestaurantModal}>
        <form onSubmit={editingRestaurant ? handleUpdateRestaurant : handleCreateRestaurant} className="space-y-4">
          <Field world={W} label="Restaurant name" htmlFor="r-name">
            <input id="r-name" type="text" required value={restaurantForm.name} onChange={(e) => setRestaurantForm({ ...restaurantForm, name: e.target.value })} className={t.input} />
          </Field>
          <Field world={W} label="Description" htmlFor="r-desc">
            <textarea id="r-desc" required rows={3} value={restaurantForm.description} onChange={(e) => setRestaurantForm({ ...restaurantForm, description: e.target.value })} className={t.input} />
          </Field>
          <Field world={W} label="Cuisines" htmlFor="r-cuisine" hint="Comma-separated, e.g. Italian, Pizza, Pasta">
            <input id="r-cuisine" type="text" required value={restaurantForm.cuisine_types} onChange={(e) => setRestaurantForm({ ...restaurantForm, cuisine_types: e.target.value })} className={t.input} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field world={W} label="Address" htmlFor="r-address">
              <input id="r-address" type="text" required value={restaurantForm.address} onChange={(e) => setRestaurantForm({ ...restaurantForm, address: e.target.value })} className={t.input} />
            </Field>
            <Field world={W} label="Phone" htmlFor="r-phone">
              <input id="r-phone" type="tel" required value={restaurantForm.phone} onChange={(e) => setRestaurantForm({ ...restaurantForm, phone: e.target.value })} className={t.input} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field world={W} label="Delivery fee (₹)" htmlFor="r-fee">
              <input id="r-fee" type="number" required min="0" step="0.01" value={restaurantForm.delivery_fee} onChange={(e) => setRestaurantForm({ ...restaurantForm, delivery_fee: parseFloat(e.target.value) })} className={t.input} />
            </Field>
            <Field world={W} label="Min time (min)" htmlFor="r-min">
              <input id="r-min" type="number" required min="1" value={restaurantForm.delivery_time_min} onChange={(e) => setRestaurantForm({ ...restaurantForm, delivery_time_min: parseInt(e.target.value) })} className={t.input} />
            </Field>
            <Field world={W} label="Max time (min)" htmlFor="r-max">
              <input id="r-max" type="number" required min="1" value={restaurantForm.delivery_time_max} onChange={(e) => setRestaurantForm({ ...restaurantForm, delivery_time_max: parseInt(e.target.value) })} className={t.input} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={closeRestaurantModal} className={t.btnGhost}>Cancel</button>
            <button type="submit" className={t.btnPrimary}>{editingRestaurant ? 'Save changes' : 'Create restaurant'}</button>
          </div>
        </form>
      </DashModal>

      {/* Menu item modal */}
      <DashModal world={W} size="lg" open={showMenuItemModal} title={editingMenuItem ? 'Edit dish' : 'Add a dish'} description={selectedRestaurant?.name} onClose={closeMenuModal}>
        <form onSubmit={editingMenuItem ? handleUpdateMenuItem : handleCreateMenuItem} className="space-y-4">
          <Field world={W} label="Dish name" htmlFor="m-name">
            <input id="m-name" type="text" required value={menuItemForm.name} onChange={(e) => setMenuItemForm({ ...menuItemForm, name: e.target.value })} className={t.input} />
          </Field>
          <Field world={W} label="Description" htmlFor="m-desc">
            <textarea id="m-desc" required rows={3} value={menuItemForm.description} onChange={(e) => setMenuItemForm({ ...menuItemForm, description: e.target.value })} className={t.input} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field world={W} label="Price (₹)" htmlFor="m-price">
              <input id="m-price" type="number" required min="0" step="0.01" value={menuItemForm.price} onChange={(e) => setMenuItemForm({ ...menuItemForm, price: parseFloat(e.target.value) })} className={t.input} />
            </Field>
            <Field world={W} label="Category" htmlFor="m-cat" hint="e.g. Starters, Mains, Desserts">
              <input id="m-cat" type="text" required value={menuItemForm.category} onChange={(e) => setMenuItemForm({ ...menuItemForm, category: e.target.value })} className={t.input} />
            </Field>
          </div>
          <div className="flex flex-wrap gap-3">
            {([
              ['is_vegetarian', 'Vegetarian'],
              ['is_vegan', 'Vegan'],
            ] as const).map(([key, label]) => (
              <label key={key} className={`flex cursor-pointer items-center gap-2.5 rounded-full border px-4 py-2 text-sm font-medium ${t.hairline} ${menuItemForm[key] ? 'border-[#1fa463] bg-[#1fa463]/10 text-[#15784a]' : ''}`}>
                <input type="checkbox" checked={menuItemForm[key]} onChange={(e) => setMenuItemForm({ ...menuItemForm, [key]: e.target.checked })} className={`h-4 w-4 ${t.checkbox}`} />
                {label}
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={closeMenuModal} className={t.btnGhost}>Cancel</button>
            <button type="submit" className={t.btnPrimary}>{editingMenuItem ? 'Save dish' : 'Add dish'}</button>
          </div>
        </form>
      </DashModal>
    </DashboardShell>
  );
};

export default RestaurantOwnerDashboard;
