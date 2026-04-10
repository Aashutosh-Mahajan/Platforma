import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts';
import { restaurantAPI, menuItemAPI, orderAPI } from '../../api/zesty';
import type { Restaurant, MenuItem, Order } from '../../types';
import { LoadingSpinner, ErrorMessage } from '../../components/shared';

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
  const [analytics, setAnalytics] = useState<Analytics>({ totalOrders: 0, revenue: 0, averageRating: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'restaurants' | 'menu' | 'orders' | 'analytics'>('restaurants');
  
  // Modal states
  const [showRestaurantModal, setShowRestaurantModal] = useState(false);
  const [showMenuItemModal, setShowMenuItemModal] = useState(false);
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

  useEffect(() => {
    loadRestaurants();
  }, []);

  useEffect(() => {
    if (selectedRestaurant) {
      loadMenuItems();
      loadOrders();
    }
  }, [selectedRestaurant?.id]);

  useEffect(() => {
    calculateAnalytics();
  }, [orders, selectedRestaurant?.id]);

  useEffect(() => {
    if (!selectedRestaurant) return;
    if (activeTab !== 'orders' && activeTab !== 'analytics') return;

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

  const calculateAnalytics = () => {
    if (!selectedRestaurant) return;
    
    const restaurantOrders = orders.filter(
      (order) => order.restaurant === selectedRestaurant.id && order.status !== 'cancelled'
    );
    
    const totalOrders = restaurantOrders.length;
    const revenue = restaurantOrders.reduce((sum, order) => sum + parseFloat(order.total.toString()), 0);
    const averageRating = selectedRestaurant.rating;
    
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

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Restaurant Owner Dashboard</h1>
          <div className="text-sm text-gray-600">
            Welcome, {user?.first_name} {user?.last_name}
          </div>
        </div>

        {error && <ErrorMessage message={error} onRetry={loadRestaurants} />}

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8 border-b">
          <button
            onClick={() => setActiveTab('restaurants')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'restaurants'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Restaurants
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'menu'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            disabled={!selectedRestaurant}
          >
            Menu Items
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'orders'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            disabled={!selectedRestaurant}
          >
            Orders
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'analytics'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            disabled={!selectedRestaurant}
          >
            Analytics
          </button>
        </div>

        {/* Restaurants Tab */}
        {activeTab === 'restaurants' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">My Restaurants</h2>
              <button
                onClick={openCreateRestaurantModal}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                + Create Restaurant
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {restaurants.map((restaurant) => (
                <div
                  key={restaurant.id}
                  className={`p-6 rounded-lg border-2 transition ${
                    selectedRestaurant?.id === restaurant.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold">{restaurant.name}</h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        restaurant.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {restaurant.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">{restaurant.description}</p>
                  <div className="space-y-2 text-sm mb-4">
                    <p>
                      <span className="font-medium">Cuisine:</span> {restaurant.cuisine_types}
                    </p>
                    <p>
                      <span className="font-medium">Rating:</span> {restaurant.rating} ⭐ ({restaurant.review_count} reviews)
                    </p>
                    <p>
                      <span className="font-medium">Delivery Fee:</span> ₹{restaurant.delivery_fee}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedRestaurant(restaurant)}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      Select
                    </button>
                    <button
                      onClick={() => openEditRestaurantModal(restaurant)}
                      className="flex-1 px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleRestaurantActive(restaurant)}
                      className={`flex-1 px-3 py-2 rounded text-sm ${
                        restaurant.is_active
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {restaurant.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Menu Items Tab */}
        {activeTab === 'menu' && selectedRestaurant && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Menu Items - {selectedRestaurant.name}</h2>
              <button
                onClick={openCreateMenuItemModal}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                + Add Menu Item
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {menuItems.map((item) => (
                <div key={item.id} className="bg-white p-6 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold">{item.name}</h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        item.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {item.is_available ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">{item.description}</p>
                  <div className="space-y-2 text-sm mb-4">
                    <p>
                      <span className="font-medium">Price:</span> ₹{item.price}
                    </p>
                    <p>
                      <span className="font-medium">Category:</span> {item.category}
                    </p>
                    <div className="flex gap-2">
                      {item.is_vegetarian && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Vegetarian</span>
                      )}
                      {item.is_vegan && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Vegan</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditMenuItemModal(item)}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleMenuItemAvailable(item)}
                      className={`flex-1 px-3 py-2 rounded text-sm ${
                        item.is_available
                          ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {item.is_available ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => handleDeleteMenuItem(item.id)}
                      className="flex-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && selectedRestaurant && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Incoming Orders - {selectedRestaurant.name}</h2>
            <div className="space-y-4">
              {orders.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No orders yet</div>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="bg-white p-6 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">Order #{order.id}</h3>
                        <p className="text-gray-600 text-sm">{new Date(order.created_at).toLocaleString()}</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          order.status === 'confirmed'
                            ? 'bg-yellow-100 text-yellow-800'
                            : order.status === 'preparing'
                            ? 'bg-blue-100 text-blue-800'
                            : order.status === 'ready'
                            ? 'bg-green-100 text-green-800'
                            : order.status === 'delivered'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {order.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="mb-4">
                      <h4 className="font-medium mb-2">Items:</h4>
                      <ul className="space-y-1 text-sm">
                        {order.items.map((item) => (
                          <li key={item.id} className="flex justify-between">
                            <span>
                              {item.menu_item?.name || 'Menu Item'} x {item.quantity}
                            </span>
                            <span className="font-medium">₹{item.total}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <p className="text-sm text-gray-600">Subtotal: ₹{order.subtotal}</p>
                          <p className="text-sm text-gray-600">Delivery Fee: ₹{order.delivery_fee}</p>
                          <p className="text-sm text-gray-600">Tax: ₹{order.tax}</p>
                          <p className="font-semibold text-lg">Total: ₹{order.total}</p>
                        </div>
                        {order.status !== 'delivered' && order.status !== 'cancelled' && (
                          <select
                            value={order.status}
                            onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded hover:border-gray-400"
                          >
                            <option value="confirmed">Confirmed</option>
                            <option value="preparing">Preparing</option>
                            <option value="ready">Ready</option>
                          </select>
                        )}
                      </div>
                      {order.special_instructions && (
                        <div className="mt-2 p-3 bg-yellow-50 rounded">
                          <p className="text-sm font-medium text-yellow-800">Special Instructions:</p>
                          <p className="text-sm text-yellow-700">{order.special_instructions}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && selectedRestaurant && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Analytics - {selectedRestaurant.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-gray-600 text-sm font-medium mb-2">Total Orders</h3>
                <p className="text-3xl font-bold text-blue-600">{analytics.totalOrders}</p>
              </div>
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-gray-600 text-sm font-medium mb-2">Total Revenue</h3>
                <p className="text-3xl font-bold text-green-600">₹{analytics.revenue.toFixed(2)}</p>
              </div>
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-gray-600 text-sm font-medium mb-2">Average Rating</h3>
                <p className="text-3xl font-bold text-yellow-600">{analytics.averageRating.toFixed(1)} ⭐</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Restaurant Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Total Reviews</p>
                  <p className="font-medium">{selectedRestaurant.review_count}</p>
                </div>
                <div>
                  <p className="text-gray-600">Delivery Time</p>
                  <p className="font-medium">
                    {selectedRestaurant.delivery_time_min}-{selectedRestaurant.delivery_time_max} mins
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Delivery Fee</p>
                  <p className="font-medium">₹{selectedRestaurant.delivery_fee}</p>
                </div>
                <div>
                  <p className="text-gray-600">Status</p>
                  <p className={`font-medium ${selectedRestaurant.is_active ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedRestaurant.is_active ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Restaurant Modal */}
        {showRestaurantModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-6">
                  {editingRestaurant ? 'Edit Restaurant' : 'Create Restaurant'}
                </h2>
                <form onSubmit={editingRestaurant ? handleUpdateRestaurant : handleCreateRestaurant}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Restaurant Name</label>
                      <input
                        type="text"
                        value={restaurantForm.name}
                        onChange={(e) => setRestaurantForm({ ...restaurantForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Description</label>
                      <textarea
                        value={restaurantForm.description}
                        onChange={(e) => setRestaurantForm({ ...restaurantForm, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Cuisine Types (comma-separated)</label>
                      <input
                        type="text"
                        value={restaurantForm.cuisine_types}
                        onChange={(e) => setRestaurantForm({ ...restaurantForm, cuisine_types: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Italian, Pizza, Pasta"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Address</label>
                      <input
                        type="text"
                        value={restaurantForm.address}
                        onChange={(e) => setRestaurantForm({ ...restaurantForm, address: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Phone</label>
                      <input
                        type="tel"
                        value={restaurantForm.phone}
                        onChange={(e) => setRestaurantForm({ ...restaurantForm, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Delivery Fee (₹)</label>
                        <input
                          type="number"
                          value={restaurantForm.delivery_fee}
                          onChange={(e) =>
                            setRestaurantForm({ ...restaurantForm, delivery_fee: parseFloat(e.target.value) })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Min Delivery Time (mins)</label>
                        <input
                          type="number"
                          value={restaurantForm.delivery_time_min}
                          onChange={(e) =>
                            setRestaurantForm({ ...restaurantForm, delivery_time_min: parseInt(e.target.value) })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="1"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Max Delivery Time (mins)</label>
                        <input
                          type="number"
                          value={restaurantForm.delivery_time_max}
                          onChange={(e) =>
                            setRestaurantForm({ ...restaurantForm, delivery_time_max: parseInt(e.target.value) })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="1"
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-6">
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      {editingRestaurant ? 'Update' : 'Create'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowRestaurantModal(false);
                        setEditingRestaurant(null);
                        resetRestaurantForm();
                      }}
                      className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Menu Item Modal */}
        {showMenuItemModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-6">
                  {editingMenuItem ? 'Edit Menu Item' : 'Add Menu Item'}
                </h2>
                <form onSubmit={editingMenuItem ? handleUpdateMenuItem : handleCreateMenuItem}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Item Name</label>
                      <input
                        type="text"
                        value={menuItemForm.name}
                        onChange={(e) => setMenuItemForm({ ...menuItemForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Description</label>
                      <textarea
                        value={menuItemForm.description}
                        onChange={(e) => setMenuItemForm({ ...menuItemForm, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Price (₹)</label>
                        <input
                          type="number"
                          value={menuItemForm.price}
                          onChange={(e) => setMenuItemForm({ ...menuItemForm, price: parseFloat(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Category</label>
                        <input
                          type="text"
                          value={menuItemForm.category}
                          onChange={(e) => setMenuItemForm({ ...menuItemForm, category: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., Pizza, Appetizers"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={menuItemForm.is_vegetarian}
                          onChange={(e) => setMenuItemForm({ ...menuItemForm, is_vegetarian: e.target.checked })}
                          className="mr-2"
                        />
                        <span className="text-sm font-medium">Vegetarian</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={menuItemForm.is_vegan}
                          onChange={(e) => setMenuItemForm({ ...menuItemForm, is_vegan: e.target.checked })}
                          className="mr-2"
                        />
                        <span className="text-sm font-medium">Vegan</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-6">
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      {editingMenuItem ? 'Update' : 'Add'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenuItemModal(false);
                        setEditingMenuItem(null);
                        resetMenuItemForm();
                      }}
                      className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantOwnerDashboard;
