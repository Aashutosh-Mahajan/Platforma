'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useCartStore } from '../store/cartStore';


export default function Cart() {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    const items = useCartStore((state) => state.items);
    const restaurantId = useCartStore((state) => state.restaurantId);
    const addItem = useCartStore((state) => state.addItem);
    const removeItem = useCartStore((state) => state.removeItem);
    const clearCart = useCartStore((state) => state.clearCart);
    const getSubtotal = useCartStore((state) => state.getSubtotal);

    const totalItems = useMemo(
        () => items.reduce((sum, item) => sum + item.quantity, 0),
        [items]
    );

    const subtotal = getSubtotal();

    const closeDrawer = () => setIsOpen(false);

    const handleReviewOrder = () => {
        closeDrawer();
        router.push('/order/confirm');
    };

    const handleIncrement = (itemId: number | string, name: string, price: number) => {
        if (restaurantId === null) {
            return;
        }

        addItem(restaurantId, {
            id: itemId,
            name,
            price,
            quantity: 1,
        });
    };

    return (
        <>
            {isOpen ? (
                <button
                    type="button"
                    aria-label="Close cart"
                    onClick={closeDrawer}
                    className="fixed inset-0 z-40 bg-[#1b1b1b]/50 backdrop-blur-[1px]"
                />
            ) : null}

            <aside
                aria-label="Cart drawer"
                className={`fixed right-0 top-0 z-50 h-full w-full max-w-md transform border-l border-[#ffd7d6] bg-[#fffaf9] shadow-[-12px_0_32px_rgba(178,37,43,0.18)] transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                <div className="flex h-full flex-col">
                    <div className="flex items-center justify-between border-b border-[#ffe2e1] px-5 py-4">
                        <h2 className="text-lg font-extrabold tracking-tight text-[#b7122a]">Your Cart</h2>
                        <button
                            type="button"
                            onClick={closeDrawer}
                            className="rounded-full border border-[#f3cecd] px-3 py-1 text-sm font-semibold text-[#9f2330] transition hover:bg-[#fff1f0]"
                        >
                            Close
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-5 py-4">
                        {items.length === 0 ? (
                            <div className="mt-10 rounded-2xl border border-dashed border-[#f5c2c0] bg-white p-8 text-center text-[#8a4a4a]">
                                Your cart is empty
                            </div>
                        ) : (
                            <ul className="space-y-3">
                                {items.map((item) => {
                                    const lineTotal = (item.price * item.quantity).toFixed(2);

                                    return (
                                        <li
                                            key={item.id}
                                            className="rounded-2xl border border-[#ffe2e1] bg-white px-4 py-3 shadow-[0_6px_18px_rgba(178,37,43,0.08)]"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <p className="text-sm font-semibold text-[#1b1b1b]">{item.name}</p>
                                                    <p className="mt-1 text-xs font-medium text-[#8a4a4a]">
                                                        ₹{item.price.toFixed(2)} each
                                                    </p>
                                                </div>
                                                <p className="text-sm font-bold text-[#b7122a]">₹{lineTotal}</p>
                                            </div>

                                            <div className="mt-3 flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(item.id)}
                                                    className="h-8 w-8 rounded-full border border-[#f4c4c3] bg-[#fff5f5] text-lg font-bold leading-none text-[#b8333f] transition hover:bg-[#ffe7e7]"
                                                    aria-label={`Decrease quantity for ${item.name}`}
                                                >
                                                    -
                                                </button>
                                                <span className="min-w-7 text-center text-sm font-bold text-[#1b1b1b]">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleIncrement(item.id, item.name, item.price)}
                                                    className="h-8 w-8 rounded-full border border-[#f4c4c3] bg-[#fff5f5] text-lg font-bold leading-none text-[#b8333f] transition hover:bg-[#ffe7e7]"
                                                    aria-label={`Increase quantity for ${item.name}`}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>

                    <div className="space-y-3 border-t border-[#ffe2e1] bg-white px-5 py-4">
                        <div className="flex items-center justify-between text-sm font-semibold text-[#5b403f]">
                            <span>Subtotal</span>
                            <span className="text-base font-bold text-[#b7122a]">₹{subtotal.toFixed(2)}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={clearCart}
                                className="rounded-xl border border-[#f3cecd] px-3 py-2 text-sm font-semibold text-[#9f2330] transition hover:bg-[#fff2f2]"
                            >
                                Clear Cart
                            </button>
                            <button
                                type="button"
                                onClick={handleReviewOrder}
                                disabled={items.length === 0}
                                className="rounded-xl bg-gradient-to-r from-[#e44d26] to-[#d62839] px-3 py-2 text-sm font-bold text-white shadow-[0_8px_20px_rgba(214,40,57,0.35)] transition hover:from-[#f05d33] hover:to-[#e13a4a] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Review Order
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            <button
                type="button"
                aria-label="Open cart"
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#ff7a28] to-[#e23744] text-white shadow-[0_14px_28px_rgba(178,37,43,0.35)] transition hover:scale-[1.03] hover:shadow-[0_18px_36px_rgba(178,37,43,0.4)]"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-6 w-6"
                >
                    <path d="M2.25 3.75a.75.75 0 000 1.5h1.386c.331 0 .614.235.674.56l1.456 7.988a2.251 2.251 0 002.214 1.852h8.43a2.25 2.25 0 002.197-1.763l1.153-5.184A1.5 1.5 0 0018.296 6.75H5.718l-.192-1.053A2.25 2.25 0 003.636 3.75H2.25zm6 14.25a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm8.25 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
                </svg>

                {totalItems > 0 ? (
                    <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#8d0f1f] px-1.5 text-[11px] font-extrabold text-white">
                        {totalItems}
                    </span>
                ) : null}
            </button>
        </>
    );
}