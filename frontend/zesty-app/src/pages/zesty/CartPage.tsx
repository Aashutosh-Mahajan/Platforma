import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Bike, Clock, Minus, Plus, ShoppingBag, TicketPercent, Trash2 } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { fallbackFoodImage } from '../../utils/foodImagery';
import { BillRows, FlowCard, FlowHeader, FlowPage, VegMark, inr } from '../../components/zesty/OrderFlow';

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, restaurant, subtotal, deliveryFee, tax, total, ready, updateQuantity, removeItem, clearCart } = useCart();
  // Clearing is destructive, so it takes two taps; the second must come within a few seconds.
  const [confirmClear, setConfirmClear] = useState(false);
  useEffect(() => {
    if (!confirmClear) return;
    const timer = window.setTimeout(() => setConfirmClear(false), 4000);
    return () => window.clearTimeout(timer);
  }, [confirmClear]);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const restaurantImage = restaurant ? restaurant.image_url || restaurant.banner || restaurant.image || fallbackFoodImage(restaurant.id) : null;

  if (!ready) {
    return (
      <FlowPage>
        <FlowHeader step={0} title="Your cart" />
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-6 px-5 py-8 sm:px-8 lg:grid-cols-3" aria-busy="true">
          <div className="h-64 animate-pulse rounded-2xl bg-[#f1e6da] lg:col-span-2" />
          <div className="h-64 animate-pulse rounded-2xl bg-[#f1e6da]" />
        </div>
      </FlowPage>
    );
  }

  if (items.length === 0) {
    return (
      <FlowPage>
        <FlowHeader step={0} title="Your cart" subtitle="Nothing here yet." />
        <div className="mx-auto max-w-xl px-5 py-16 text-center sm:px-8">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-zesty-red/10 text-zesty-red">
            <ShoppingBag className="h-8 w-8" strokeWidth={1.6} aria-hidden="true" />
          </span>
          <h2 className="mt-5 font-zesty-display text-2xl font-bold">Your cart is empty</h2>
          <p className="mt-2 text-[#7a6d63]">Pick a restaurant, add a few dishes and they'll wait for you here.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/zesty" className="inline-flex items-center gap-2 rounded-full bg-zesty-red px-6 py-3 font-semibold text-white transition-colors hover:bg-zesty-redDark">
              Browse restaurants <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link to="/zesty/orders" className="rounded-full border border-[#e7d9cb] bg-white px-6 py-3 font-semibold transition-colors hover:bg-[#fbf5ee]">
              Past orders
            </Link>
          </div>
        </div>
      </FlowPage>
    );
  }

  return (
    <FlowPage>
      <FlowHeader
        step={0}
        image={restaurantImage}
        back={restaurant ? { to: `/zesty/restaurants/${restaurant.id}`, label: `Back to ${restaurant.name}` } : { to: '/zesty', label: 'Restaurants' }}
        title="Your cart"
        subtitle={
          restaurant && (
            <span className="inline-flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="font-semibold text-white">{restaurant.name}</span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" aria-hidden="true" /> {restaurant.delivery_time_min}–{restaurant.delivery_time_max} min
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Bike className="h-4 w-4" aria-hidden="true" /> {Number(restaurant.delivery_fee) ? `${inr(restaurant.delivery_fee, false)} delivery` : 'Free delivery'}
              </span>
            </span>
          )
        }
      />

      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-start gap-6 px-5 py-8 sm:px-8 lg:grid-cols-3">
        <FlowCard
          className="lg:col-span-2"
          title={`${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
          action={
            <button
              type="button"
              onClick={() => (confirmClear ? (clearCart(), setConfirmClear(false)) : setConfirmClear(true))}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                confirmClear ? 'bg-rose-600 text-white' : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" /> {confirmClear ? 'Tap again to clear' : 'Clear cart'}
            </button>
          }
        >
          <ul className="-my-4 divide-y divide-[#f3e9de]">
            {items.map((item) => (
              <li key={item.menuItem.id} className="flex gap-4 py-4">
                <img
                  src={item.menuItem.image || fallbackFoodImage(item.menuItem.id)}
                  alt=""
                  className="h-20 w-20 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="flex items-start gap-2 font-semibold">
                    <span className="mt-1"><VegMark veg={item.menuItem.is_vegetarian} /></span>
                    <span className="line-clamp-2">{item.menuItem.name}</span>
                  </p>
                  <p className="mt-0.5 text-sm text-[#7a6d63]">{inr(item.menuItem.price)} each</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center rounded-full border border-[#e7d9cb] bg-[#fbf5ee] p-0.5">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.menuItem.id, item.quantity - 1)}
                        className="grid h-8 w-8 place-items-center rounded-full text-zesty-redDark transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zesty-red"
                        aria-label={item.quantity === 1 ? `Remove ${item.menuItem.name}` : `One less ${item.menuItem.name}`}
                      >
                        {item.quantity === 1 ? <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> : <Minus className="h-3.5 w-3.5" aria-hidden="true" />}
                      </button>
                      <span className="w-8 text-center text-sm font-bold tabular-nums" aria-live="polite">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.menuItem.id, item.quantity + 1)}
                        className="grid h-8 w-8 place-items-center rounded-full text-zesty-redDark transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zesty-red"
                        aria-label={`One more ${item.menuItem.name}`}
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    {item.quantity > 1 && (
                      <button type="button" onClick={() => removeItem(item.menuItem.id)} className="text-sm font-medium text-[#7a6d63] hover:text-rose-700">
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <p className="shrink-0 font-semibold tabular-nums">{inr(item.menuItem.price * item.quantity)}</p>
              </li>
            ))}
          </ul>
          {restaurant && (
            <Link
              to={`/zesty/restaurants/${restaurant.id}`}
              className="mt-6 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#e7d9cb] py-3 text-sm font-semibold text-zesty-redDark transition-colors hover:border-zesty-red"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Add more from {restaurant.name}
            </Link>
          )}
        </FlowCard>

        <div className="space-y-4 lg:sticky lg:top-20">
          <FlowCard title="Bill details">
            <BillRows subtotal={subtotal} deliveryFee={deliveryFee} tax={tax} total={total} />
            <button
              type="button"
              onClick={() => navigate('/zesty/checkout')}
              className="mt-6 flex w-full items-center justify-between rounded-full bg-zesty-red px-6 py-3.5 font-semibold text-white transition-colors hover:bg-zesty-redDark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zesty-red focus-visible:ring-offset-2"
            >
              <span>Checkout</span>
              <span className="inline-flex items-center gap-2 tabular-nums">
                {inr(total)} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </button>
          </FlowCard>
          <p className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm text-[#7a6d63] ring-1 ring-[#efe2d4]">
            <TicketPercent className="h-4 w-4 shrink-0 text-zesty-red" aria-hidden="true" />
            Have a promo code? Apply it at checkout.
          </p>
        </div>
      </div>
    </FlowPage>
  );
};

export default CartPage;
