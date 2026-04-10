import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { addressAPI } from '../../api/addresses';
import { orderAPI } from '../../api/zesty';
import type { Address } from '../../types';

type NewAddressForm = {
  label: 'home' | 'work' | 'other';
  street: string;
  city: string;
  state: string;
  postal_code: string;
};

type ApiLikeError = {
  response?: {
    data?: {
      detail?: string;
      message?: string;
      error?: string;
    };
  };
};

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, restaurant, subtotal, deliveryFee, tax, total, clearCart } = useCart();
  const { isAuthenticated } = useAuth();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('credit_card');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [savingAddress, setSavingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState<NewAddressForm>({
    label: 'home',
    street: '',
    city: '',
    state: '',
    postal_code: '',
  });

  const readApiErrorMessage = (err: unknown, fallbackMessage: string): string => {
    if (typeof err !== 'object' || err === null) {
      return fallbackMessage;
    }

    const apiError = err as ApiLikeError;
    return apiError.response?.data?.detail || apiError.response?.data?.message || apiError.response?.data?.error || fallbackMessage;
  };

  const fetchAddresses = useCallback(async () => {
    try {
      setLoadingAddresses(true);
      const response = await addressAPI.list();
      setAddresses(response.results);
      
      // Auto-select default address
      const defaultAddress = response.results.find(addr => addr.is_default);
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id);
      } else if (response.results.length > 0) {
        setSelectedAddressId(response.results[0].id);
      }
    } catch (err: unknown) {
      setError(readApiErrorMessage(err, 'Failed to load addresses'));
    } finally {
      setLoadingAddresses(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (items.length === 0) {
      navigate('/zesty/cart');
      return;
    }

    fetchAddresses();
  }, [isAuthenticated, items, navigate, fetchAddresses]);

  const handlePlaceOrder = async () => {
    if (!restaurant) {
      setError('Restaurant information is missing');
      return;
    }

    let addressId = selectedAddressId;

    if (!addressId) {
      const hasAllAddressFields =
        newAddress.street.trim() &&
        newAddress.city.trim() &&
        newAddress.state.trim() &&
        newAddress.postal_code.trim();

      if (!hasAllAddressFields) {
        setError('Delivery address is required. Please fill all address fields.');
        return;
      }

      try {
        setSavingAddress(true);
        const createdAddress = await addressAPI.create({
          ...newAddress,
          street: newAddress.street.trim(),
          city: newAddress.city.trim(),
          state: newAddress.state.trim(),
          postal_code: newAddress.postal_code.trim(),
          is_default: addresses.length === 0,
        });

        setAddresses((prev) => [...prev, createdAddress]);
        setSelectedAddressId(createdAddress.id);
        addressId = createdAddress.id;
      } catch {
        setError('Failed to save address. Please check the details and try again.');
        return;
      } finally {
        setSavingAddress(false);
      }
    }

    setLoading(true);
    setError(null);

    try {
      const orderData = {
        restaurant_id: restaurant.id,
        delivery_address_id: addressId,
        special_instructions: specialInstructions,
        payment_method: paymentMethod,
        items: items.map(item => ({
          menu_item_id: item.menuItem.id,
          quantity: item.quantity,
          menu_item_name: item.menuItem.name,
          unit_price: item.menuItem.price,
        })),
      };

      const order = await orderAPI.create(orderData);
      clearCart();
      navigate(`/zesty/orders/${order.id}`);
    } catch (err: unknown) {
      const errorMessage = readApiErrorMessage(err, 'Failed to place order. Please try again.');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loadingAddresses) {
    return (
      <div className="theme-zesty theme-zesty-page min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="theme-zesty theme-zesty-page min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Checkout
          </h1>
          {restaurant && (
            <p className="text-gray-600 dark:text-gray-400">
              Order from {restaurant.name}
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Address */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Delivery Address <span className="text-red-500">*</span>
                </h2>
                <button
                  onClick={() => navigate('/profile')}
                  className="text-sm text-orange-500 hover:text-orange-600"
                >
                  Manage Addresses
                </button>
              </div>

              {addresses.length === 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Enter your delivery address to continue. This field is required before placing an order.
                  </p>

                  <div>
                    <label htmlFor="address-label" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Address Label
                    </label>
                    <select
                      id="address-label"
                      value={newAddress.label}
                      onChange={(e) => setNewAddress((prev) => ({ ...prev, label: e.target.value as NewAddressForm['label'] }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="home">Home</option>
                      <option value="work">Work</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="address-street" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Street Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="address-street"
                      value={newAddress.street}
                      onChange={(e) => setNewAddress((prev) => ({ ...prev, street: e.target.value }))}
                      placeholder="Flat / Building / Street"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label htmlFor="address-city" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="address-city"
                        value={newAddress.city}
                        onChange={(e) => setNewAddress((prev) => ({ ...prev, city: e.target.value }))}
                        placeholder="City"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    <div>
                      <label htmlFor="address-state" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        State <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="address-state"
                        value={newAddress.state}
                        onChange={(e) => setNewAddress((prev) => ({ ...prev, state: e.target.value }))}
                        placeholder="State"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    <div>
                      <label htmlFor="address-postal" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Postal Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="address-postal"
                        value={newAddress.postal_code}
                        onChange={(e) => setNewAddress((prev) => ({ ...prev, postal_code: e.target.value }))}
                        placeholder="Postal code"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map(address => (
                    <label
                      key={address.id}
                      className={`block p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        selectedAddressId === address.id
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="address"
                        value={address.id}
                        checked={selectedAddressId === address.id}
                        onChange={() => setSelectedAddressId(address.id)}
                        className="sr-only"
                      />
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900 dark:text-white capitalize">
                              {address.label}
                            </span>
                            {address.is_default && (
                              <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {address.street}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {address.city}, {address.state} {address.postal_code}
                          </p>
                        </div>
                        {selectedAddressId === address.id && (
                          <span className="text-orange-500">✓</span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Special Instructions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Special Instructions
              </h2>
              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="Add any special instructions for your order (optional)"
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
              />
            </div>

            {/* Payment Method */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Payment Method
              </h2>
              <div className="space-y-3">
                {[
                  { value: 'credit_card', label: 'Credit Card', icon: '💳' },
                  { value: 'debit_card', label: 'Debit Card', icon: '💳' },
                  { value: 'upi', label: 'UPI', icon: '📱' },
                  { value: 'wallet', label: 'Wallet', icon: '👛' },
                  { value: 'net_banking', label: 'Net Banking', icon: '🏦' },
                  { value: 'cash_on_delivery', label: 'Cash on Delivery', icon: '💵' },
                ].map(method => (
                  <label
                    key={method.value}
                    className={`block p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      paymentMethod === method.value
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={method.value}
                      checked={paymentMethod === method.value}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="sr-only"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{method.icon}</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {method.label}
                        </span>
                      </div>
                      {paymentMethod === method.value && (
                        <span className="text-orange-500">✓</span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 sticky top-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Order Summary
              </h2>

              {/* Items */}
              <div className="space-y-2 mb-4">
                {items.map(item => (
                  <div key={item.menuItem.id} className="flex justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">
                      {item.quantity}x {item.menuItem.name}
                    </span>
                    <span className="text-gray-900 dark:text-white">
                      ₹{(item.menuItem.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-2 mb-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                  <span>Delivery Fee</span>
                  <span>₹{deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                  <span>Tax (5%)</span>
                  <span>₹{tax.toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-6">
                <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-white">
                  <span>Total</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={loading || savingAddress}
                className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? 'Placing Order...' : savingAddress ? 'Saving Address...' : 'Place Order'}
              </button>

              <button
                onClick={() => navigate('/zesty/cart')}
                className="w-full mt-3 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Back to Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
