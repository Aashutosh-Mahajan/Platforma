import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Banknote, Check, CreditCard, Landmark, Lock, MapPin, Plus, Smartphone, Tag, Wallet, X } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { addressAPI } from '../../api/addresses';
import { orderAPI, promotionAPI } from '../../api/zesty';
import type { Address } from '../../types';
import { fallbackFoodImage } from '../../utils/foodImagery';
import { BillRows, FlowCard, FlowHeader, FlowPage, VegMark, inr } from '../../components/zesty/OrderFlow';

const PAYMENT_METHODS = [
  { value: 'credit_card', label: 'Credit Card', Icon: CreditCard },
  { value: 'debit_card', label: 'Debit Card', Icon: CreditCard },
  { value: 'upi', label: 'UPI', Icon: Smartphone },
  { value: 'wallet', label: 'Wallet', Icon: Wallet },
  { value: 'net_banking', label: 'Net Banking', Icon: Landmark },
  { value: 'cash_on_delivery', label: 'Cash on Delivery', Icon: Banknote },
] as const;

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
  const { items, restaurant, subtotal, deliveryFee, clearCart, ready } = useCart();
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
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [applyingPromo, setApplyingPromo] = useState(false);

  // CheckoutPage and OrderDetailPage are both lazy-loaded, so React Suspense
  // keeps this component mounted for one extra render while the order
  // detail chunk loads. clearCart() (called right after a successful order)
  // makes `items` empty on that extra render, which would otherwise re-fire
  // the "empty cart -> back to /zesty/cart" effect below and clobber the
  // navigate to the order confirmation page. This ref tells that effect to
  // stand down once an order has actually been placed.
  const orderPlacedRef = useRef(false);

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
    if (orderPlacedRef.current) {
      return;
    }

    // Wait until the cart has loaded for this account: on a refresh the cart
    // is briefly empty while it's fetched, and treating that as "empty cart"
    // used to bounce people back to /zesty/cart.
    if (!ready) {
      return;
    }

    if (!isAuthenticated) {
      // Defense-in-depth only — ProtectedRoute already gates this route
      // and carries its own `from` state, so this should be unreachable
      // in normal operation. Kept consistent with it regardless.
      navigate('/login', { state: { from: '/zesty/checkout' } });
      return;
    }

    if (items.length === 0) {
      navigate('/zesty/cart');
      return;
    }

    fetchAddresses();
  }, [ready, isAuthenticated, items.length, navigate, fetchAddresses]);

  const handleApplyPromo = async () => {
    if (!restaurant || !promoCode.trim()) return;

    setApplyingPromo(true);
    setPromoError(null);
    try {
      const result = await promotionAPI.validate(promoCode.trim(), restaurant.id, subtotal);
      setAppliedPromo({ code: result.code, discount: result.discount });
    } catch (err: unknown) {
      setAppliedPromo(null);
      setPromoError(readApiErrorMessage(err, 'Invalid promo code'));
    } finally {
      setApplyingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCode('');
    setPromoError(null);
  };

  // Mirrors Order.calculate_totals on the backend exactly (tax on the
  // post-discount amount) so what's shown here matches what gets charged.
  const discount = appliedPromo?.discount || 0;
  const discountedSubtotal = Math.max(subtotal - discount, 0);
  const previewTax = discountedSubtotal * 0.05;
  const previewTotal = discountedSubtotal + deliveryFee + previewTax;

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
        promo_code: appliedPromo?.code || undefined,
        items: items.map(item => ({
          menu_item_id: item.menuItem.id,
          quantity: item.quantity,
          menu_item_name: item.menuItem.name,
          unit_price: item.menuItem.price,
        })),
      };

      const order = await orderAPI.create(orderData);
      // See orderPlacedRef's comment above: this must be set before
      // clearCart() so this still-mounted (Suspense-pending) instance's
      // empty-cart effect no-ops instead of overriding the navigate below.
      orderPlacedRef.current = true;
      clearCart();
      navigate(`/zesty/orders/${order.id}`);
    } catch (err: unknown) {
      const errorMessage = readApiErrorMessage(err, 'Failed to place order. Please try again.');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const addingNewAddress = selectedAddressId === null;
  const restaurantImage = restaurant ? restaurant.image_url || restaurant.banner || restaurant.image || fallbackFoodImage(restaurant.id) : null;
  const fieldClass =
    'w-full rounded-xl border border-[#e7d9cb] bg-white px-3.5 py-2.5 text-sm placeholder:text-[#b3a597] focus:border-zesty-red focus:outline-none focus:ring-2 focus:ring-zesty-red/20';

  if (!ready || loadingAddresses) {
    return (
      <FlowPage>
        <FlowHeader step={1} title="Checkout" image={restaurantImage} />
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-6 px-5 py-8 sm:px-8 lg:grid-cols-3" aria-busy="true" aria-label="Loading checkout">
          <div className="space-y-6 lg:col-span-2">
            <div className="h-40 animate-pulse rounded-2xl bg-[#f1e6da]" />
            <div className="h-56 animate-pulse rounded-2xl bg-[#f1e6da]" />
          </div>
          <div className="h-80 animate-pulse rounded-2xl bg-[#f1e6da]" />
        </div>
      </FlowPage>
    );
  }

  return (
    <FlowPage>
      <FlowHeader
        step={1}
        image={restaurantImage}
        back={{ to: '/zesty/cart', label: 'Back to cart' }}
        title="Checkout"
        subtitle={restaurant && <>Ordering from <span className="font-semibold text-white">{restaurant.name}</span> · {restaurant.delivery_time_min}–{restaurant.delivery_time_max} min</>}
      />

      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-start gap-6 px-5 py-8 sm:px-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* 1. Address */}
          <FlowCard
            number={1}
            title="Delivery address"
            action={
              <button type="button" onClick={() => navigate('/profile')} className="text-sm font-semibold text-zesty-redDark hover:underline">
                Manage addresses
              </button>
            }
          >
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Delivery address">
              {addresses.map((address) => {
                const selected = selectedAddressId === address.id;
                return (
                  <label
                    key={address.id}
                    className={`relative flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors focus-within:ring-2 focus-within:ring-zesty-red ${
                      selected ? 'border-zesty-red bg-zesty-red/[0.04] ring-1 ring-zesty-red' : 'border-[#e7d9cb] hover:border-[#c9b6a4]'
                    }`}
                  >
                    <input type="radio" name="address" value={address.id} checked={selected} onChange={() => setSelectedAddressId(address.id)} className="sr-only" />
                    <MapPin className={`mt-0.5 h-5 w-5 shrink-0 ${selected ? 'text-zesty-red' : 'text-[#a89a8e]'}`} aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 font-semibold capitalize">
                        {address.label}
                        {address.is_default && <span className="rounded-full bg-[#1fa463]/12 px-2 py-0.5 text-[11px] font-semibold normal-case text-[#15784a]">Default</span>}
                      </span>
                      <span className="mt-0.5 block text-sm text-[#7a6d63]">{address.street}</span>
                      <span className="block text-sm text-[#7a6d63]">
                        {address.city}, {address.state} {address.postal_code}
                      </span>
                    </span>
                    {selected && (
                      <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-zesty-red text-white">
                        <Check className="h-3 w-3" aria-hidden="true" />
                      </span>
                    )}
                  </label>
                );
              })}
              {addresses.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedAddressId(null)}
                  aria-pressed={addingNewAddress}
                  className={`flex min-h-[96px] items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-sm font-semibold transition-colors ${
                    addingNewAddress ? 'border-zesty-red text-zesty-redDark' : 'border-[#e7d9cb] text-[#7a6d63] hover:border-zesty-red hover:text-zesty-redDark'
                  }`}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" /> Deliver somewhere else
                </button>
              )}
            </div>

            {addingNewAddress && (
              <div className={`${addresses.length ? 'mt-5 border-t border-[#efe2d4] pt-5' : ''} space-y-4`}>
                <p className="text-sm text-[#7a6d63]">
                  {addresses.length ? 'We’ll save this address to your account.' : 'Add where we should deliver. We’ll save it for next time.'}
                </p>
                <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
                  <label className="block">
                    <span className="mb-1.5 block text-[13px] font-semibold">Label</span>
                    <select
                      id="address-label"
                      value={newAddress.label}
                      onChange={(e) => setNewAddress((prev) => ({ ...prev, label: e.target.value as NewAddressForm['label'] }))}
                      className={fieldClass}
                    >
                      <option value="home">Home</option>
                      <option value="work">Work</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[13px] font-semibold">Street address</span>
                    <input
                      id="address-street"
                      autoComplete="street-address"
                      value={newAddress.street}
                      onChange={(e) => setNewAddress((prev) => ({ ...prev, street: e.target.value }))}
                      placeholder="Flat, building, street"
                      className={fieldClass}
                    />
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className="mb-1.5 block text-[13px] font-semibold">City</span>
                    <input id="address-city" autoComplete="address-level2" value={newAddress.city} onChange={(e) => setNewAddress((prev) => ({ ...prev, city: e.target.value }))} className={fieldClass} />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[13px] font-semibold">State</span>
                    <input id="address-state" autoComplete="address-level1" value={newAddress.state} onChange={(e) => setNewAddress((prev) => ({ ...prev, state: e.target.value }))} className={fieldClass} />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[13px] font-semibold">PIN code</span>
                    <input
                      id="address-postal"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      value={newAddress.postal_code}
                      onChange={(e) => setNewAddress((prev) => ({ ...prev, postal_code: e.target.value }))}
                      className={fieldClass}
                    />
                  </label>
                </div>
              </div>
            )}
          </FlowCard>

          {/* 2. Payment */}
          <FlowCard number={2} title="Payment">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label="Payment method">
              {PAYMENT_METHODS.map((method) => {
                const selected = paymentMethod === method.value;
                return (
                  <label
                    key={method.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 transition-colors focus-within:ring-2 focus-within:ring-zesty-red ${
                      selected ? 'border-zesty-red bg-zesty-red/[0.04] ring-1 ring-zesty-red' : 'border-[#e7d9cb] hover:border-[#c9b6a4]'
                    }`}
                  >
                    <input type="radio" name="payment" value={method.value} checked={selected} onChange={(e) => setPaymentMethod(e.target.value)} className="sr-only" />
                    <method.Icon className={`h-5 w-5 ${selected ? 'text-zesty-red' : 'text-[#a89a8e]'}`} aria-hidden="true" />
                    <span className="text-sm font-semibold">{method.label}</span>
                    {selected && <Check className="ml-auto h-4 w-4 text-zesty-red" aria-hidden="true" />}
                  </label>
                );
              })}
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs text-[#a89a8e]">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              {paymentMethod === 'cash_on_delivery' ? 'Pay the rider when your food arrives.' : 'Payments are simulated in this environment; no money moves.'}
            </p>
          </FlowCard>

          {/* 3. Instructions */}
          <FlowCard number={3} title={<>Instructions <span className="text-sm font-normal text-[#a89a8e]">(optional)</span></>}>
            <textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Less spicy, no onions, ring the bell twice…"
              rows={3}
              maxLength={500}
              className={`${fieldClass} resize-none`}
            />
          </FlowCard>
        </div>

        {/* Summary */}
        <div className="lg:sticky lg:top-20">
          <FlowCard title="Your order">
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.menuItem.id} className="flex items-start justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-start gap-2">
                    <span className="mt-0.5">
                      <VegMark veg={item.menuItem.is_vegetarian} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{item.menuItem.name}</span>
                      <span className="text-xs text-[#a89a8e]">× {item.quantity}</span>
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums">{inr(item.menuItem.price * item.quantity)}</span>
                </li>
              ))}
            </ul>

            <div className="my-5 border-t border-[#efe2d4] pt-5">
              {appliedPromo ? (
                <div className="flex items-center justify-between rounded-xl bg-[#1fa463]/10 px-3.5 py-2.5">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#15784a]">
                    <Tag className="h-4 w-4" aria-hidden="true" /> {appliedPromo.code} applied
                  </span>
                  <button type="button" onClick={handleRemovePromo} className="rounded p-1 text-[#15784a] hover:bg-[#1fa463]/15" aria-label="Remove promo code">
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleApplyPromo();
                  }}
                >
                  <label htmlFor="promo-code" className="mb-1.5 block text-[13px] font-semibold">
                    Promo code
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="promo-code"
                      value={promoCode}
                      onChange={(e) => {
                        setPromoCode(e.target.value.toUpperCase());
                        setPromoError(null);
                      }}
                      placeholder="e.g. WELCOME10"
                      aria-invalid={!!promoError}
                      className={`${fieldClass} font-mono uppercase tracking-wide placeholder:font-sans placeholder:normal-case placeholder:tracking-normal`}
                    />
                    <button
                      type="submit"
                      disabled={applyingPromo || !promoCode.trim()}
                      className="shrink-0 rounded-xl border border-zesty-red px-4 text-sm font-semibold text-zesty-redDark transition-colors hover:bg-zesty-red/5 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {applyingPromo ? 'Checking…' : 'Apply'}
                    </button>
                  </div>
                  {promoError && (
                    <p role="alert" className="mt-1.5 text-xs text-rose-600">
                      {promoError}
                    </p>
                  )}
                </form>
              )}
            </div>

            <BillRows subtotal={subtotal} discount={discount} deliveryFee={deliveryFee} tax={previewTax} total={previewTotal} promoCode={appliedPromo?.code} />

            {error && (
              <p role="alert" className="mt-5 flex items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-3 text-sm text-rose-800 ring-1 ring-inset ring-rose-600/15">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {error}
              </p>
            )}

            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={loading || savingAddress}
              aria-busy={loading || savingAddress}
              className="mt-6 flex w-full items-center justify-between rounded-full bg-zesty-red px-6 py-3.5 font-semibold text-white transition-colors hover:bg-zesty-redDark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zesty-red focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span>{loading ? 'Placing order…' : savingAddress ? 'Saving address…' : 'Place order'}</span>
              <span className="inline-flex items-center gap-2 tabular-nums">
                {inr(previewTotal)} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </button>
          </FlowCard>
        </div>
      </div>
    </FlowPage>
  );
};

export default CheckoutPage;
