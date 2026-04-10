'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useCartStore } from '../../../store/cartStore';

const HOME_ROUTE = '/restaurants';
const GST_RATE = 0.05;
const PLATFORM_FEE = 5;
const DELIVERY_CHARGE = 30;

function formatCurrency(amount: number): string {
    return `₹${amount.toFixed(2)}`;
}

export default function OrderConfirmPage() {
    const router = useRouter();

    const items = useCartStore((state) => state.items);
    const restaurantId = useCartStore((state) => state.restaurantId);
    const clearCart = useCartStore((state) => state.clearCart);

    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const isCartEmpty = items.length === 0;

    useEffect(() => {
        if (isCartEmpty) {
            router.replace(HOME_ROUTE);
        }
    }, [isCartEmpty, router]);

    const subtotal = useMemo(
        () => Number(items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)),
        [items]
    );
    const gst = Number((subtotal * GST_RATE).toFixed(2));
    const total = Number((subtotal + gst + PLATFORM_FEE + DELIVERY_CHARGE).toFixed(2));

    const handlePlaceOrder = async () => {
        if (isCartEmpty) {
            router.replace(HOME_ROUTE);
            return;
        }

        const numericRestaurantId = Number(restaurantId);
        if (!Number.isFinite(numericRestaurantId) || numericRestaurantId <= 0) {
            setErrorMessage('Unable to place order because restaurant information is missing.');
            return;
        }

        setErrorMessage('');
        setIsPlacingOrder(true);

        try {
            const response = await fetch('/api/orders/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    restaurant_id: numericRestaurantId,
                    items: items.map((item) => ({
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity,
                    })),
                }),
            });

            let responseData: Record<string, unknown> | null = null;
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                responseData = await response.json();
            }

            if (!response.ok) {
                const apiError =
                    (responseData?.detail as string | undefined) ||
                    (responseData?.message as string | undefined) ||
                    'Failed to place order. Please try again.';
                throw new Error(apiError);
            }

            const orderId =
                (responseData?.id as number | string | undefined) ||
                (responseData?.order_id as number | string | undefined) ||
                ((responseData?.order as Record<string, unknown> | undefined)?.id as
                    | number
                    | string
                    | undefined);

            if (!orderId) {
                throw new Error('Order placed but no order id was returned by the server.');
            }

            clearCart();
            router.push(`/order/${orderId}`);
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'Failed to place order. Please try again.'
            );
        } finally {
            setIsPlacingOrder(false);
        }
    };

    if (isCartEmpty) {
        return null;
    }

    return (
        <main className="min-h-screen bg-[#fff7f6] px-4 py-6 text-[#1b1b1b] md:px-6 md:py-8">
            <section className="mx-auto w-full max-w-3xl rounded-2xl border border-[#ffd9d7] bg-white p-4 shadow-[0_14px_32px_rgba(183,18,42,0.08)] md:p-6">
                <header className="border-b border-[#ffe8e6] pb-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#b7122a]">
                        Final Review
                    </p>
                    <h1 className="mt-2 text-2xl font-black tracking-tight text-[#1b1b1b] md:text-3xl">
                        Confirm Your Order
                    </h1>
                    <p className="mt-2 text-sm text-[#6e4c4b]">
                        Verify items and total before placing your order.
                    </p>
                </header>

                <div className="mt-5">
                    <h2 className="text-base font-extrabold text-[#1b1b1b]">Items</h2>
                    <ul className="mt-3 space-y-3">
                        {items.map((item) => {
                            const lineTotal = Number((item.price * item.quantity).toFixed(2));

                            return (
                                <li
                                    key={item.id}
                                    className="rounded-xl border border-[#ffe2e1] bg-[#fffdfd] px-4 py-3"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-bold text-[#1b1b1b]">{item.name}</p>
                                            <p className="mt-1 text-xs font-medium text-[#75504f]">
                                                Qty {item.quantity} x {formatCurrency(item.price)}
                                            </p>
                                        </div>
                                        <p className="text-sm font-extrabold text-[#b7122a]">
                                            {formatCurrency(lineTotal)}
                                        </p>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                <div className="mt-6 rounded-xl border border-[#ffd9d7] bg-[#fff9f8] p-4">
                    <h2 className="text-base font-extrabold text-[#1b1b1b]">Bill Details</h2>
                    <dl className="mt-3 space-y-2 text-sm">
                        <div className="flex items-center justify-between text-[#5f3f3e]">
                            <dt>Subtotal</dt>
                            <dd>{formatCurrency(subtotal)}</dd>
                        </div>
                        <div className="flex items-center justify-between text-[#5f3f3e]">
                            <dt>GST (5%)</dt>
                            <dd>{formatCurrency(gst)}</dd>
                        </div>
                        <div className="flex items-center justify-between text-[#5f3f3e]">
                            <dt>Platform Fee</dt>
                            <dd>{formatCurrency(PLATFORM_FEE)}</dd>
                        </div>
                        <div className="flex items-center justify-between text-[#5f3f3e]">
                            <dt>Delivery Charge</dt>
                            <dd>{formatCurrency(DELIVERY_CHARGE)}</dd>
                        </div>
                        <div className="mt-2 flex items-center justify-between border-t border-[#ffe1df] pt-2 text-base font-black text-[#1b1b1b]">
                            <dt>Total</dt>
                            <dd>{formatCurrency(total)}</dd>
                        </div>
                    </dl>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-[#ffe3e2] bg-white px-4 py-3">
                    <span className="text-sm font-semibold text-[#5b3f3e]">Payment Method</span>
                    <span className="rounded-full bg-[#ffece8] px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-[#bf2d2b]">
                        Cash on Delivery
                    </span>
                </div>

                {errorMessage ? (
                    <p className="mt-4 rounded-lg border border-[#fecaca] bg-[#fff5f5] px-3 py-2 text-sm font-semibold text-[#b91c1c]">
                        {errorMessage}
                    </p>
                ) : null}

                <button
                    type="button"
                    onClick={handlePlaceOrder}
                    disabled={isPlacingOrder}
                    className="mt-6 w-full rounded-xl bg-gradient-to-r from-[#ff7a28] to-[#e23744] px-4 py-3 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(226,55,68,0.26)] transition hover:from-[#ff8b3d] hover:to-[#ef4d5a] disabled:cursor-not-allowed disabled:opacity-70"
                >
                    {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
                </button>
            </section>
        </main>
    );
}