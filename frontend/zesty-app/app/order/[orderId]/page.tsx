'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import OrderBill from '../../../components/OrderBill';
import OrderTracker, { OrderStatus } from '../../../components/OrderTracker';

type OrderItem = {
    id?: number | string;
    name: string;
    price: number | string;
    quantity: number | string;
};

type OrderResponse = {
    id: number | string;
    status: OrderStatus;
    items: OrderItem[];
    subtotal: number | string;
    gst: number | string;
    platform_fee: number | string;
    delivery_charge: number | string;
    total: number | string;
};

type PageProps = {
    params: {
        orderId: string;
    };
};

const STATUS_STEPS: Array<{ status: OrderStatus; delayMs: number }> = [
    { status: 'placed', delayMs: 0 },
    { status: 'confirmed', delayMs: 4000 },
    { status: 'preparing', delayMs: 4000 },
    { status: 'out_for_delivery', delayMs: 6000 },
    { status: 'delivered', delayMs: 6000 },
];

function toNumber(value: number | string | undefined | null): number {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
}

export default function OrderTrackingPage({ params }: PageProps) {
    const { orderId } = params;

    const [order, setOrder] = useState<OrderResponse | null>(null);
    const [currentStatus, setCurrentStatus] = useState<OrderStatus>('placed');
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    const timeoutRefs = useRef<Array<ReturnType<typeof setTimeout>>>([]);
    const isMountedRef = useRef(true);

    const isDelivered = currentStatus === 'delivered';

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            timeoutRefs.current.forEach((timerId) => clearTimeout(timerId));
            timeoutRefs.current = [];
        };
    }, []);

    useEffect(() => {
        const syncStatus = async (nextStatus: OrderStatus): Promise<void> => {
            const response = await fetch(`/api/orders/${orderId}/status/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: nextStatus }),
            });

            let data: Record<string, unknown> | null = null;
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                data = await response.json();
            }

            if (!response.ok) {
                const apiError =
                    (data?.detail as string | undefined) ||
                    (data?.message as string | undefined) ||
                    `Failed to update status to ${nextStatus}.`;
                throw new Error(apiError);
            }

            if (!isMountedRef.current) {
                return;
            }

            setCurrentStatus(nextStatus);
            setOrder((prevOrder) => {
                if (!prevOrder) {
                    return prevOrder;
                }
                return {
                    ...prevOrder,
                    status: nextStatus,
                };
            });
        };

        const runStep = (stepIndex: number): void => {
            if (stepIndex >= STATUS_STEPS.length) {
                return;
            }

            const { status, delayMs } = STATUS_STEPS[stepIndex];

            const timeoutId = setTimeout(async () => {
                if (!isMountedRef.current) {
                    return;
                }

                try {
                    await syncStatus(status);
                    if (status !== 'delivered') {
                        runStep(stepIndex + 1);
                    }
                } catch (error) {
                    if (!isMountedRef.current) {
                        return;
                    }

                    setErrorMessage(
                        error instanceof Error
                            ? error.message
                            : 'Unable to update order status automatically.'
                    );
                }
            }, delayMs);

            timeoutRefs.current.push(timeoutId);
        };

        const loadOrder = async () => {
            setIsLoading(true);
            setErrorMessage('');

            try {
                const response = await fetch(`/api/orders/${orderId}/`);
                if (!response.ok) {
                    throw new Error('Failed to load order details.');
                }

                const data = (await response.json()) as OrderResponse;

                if (!isMountedRef.current) {
                    return;
                }

                setOrder(data);
                setCurrentStatus(data.status || 'placed');
                runStep(0);
            } catch (error) {
                if (!isMountedRef.current) {
                    return;
                }

                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : 'Something went wrong while fetching your order.'
                );
            } finally {
                if (isMountedRef.current) {
                    setIsLoading(false);
                }
            }
        };

        loadOrder();

        return () => {
            timeoutRefs.current.forEach((timerId) => clearTimeout(timerId));
            timeoutRefs.current = [];
        };
    }, [orderId]);

    const billData = useMemo(() => {
        const safeItems = Array.isArray(order?.items) ? order?.items : [];
        const subtotal = toNumber(order?.subtotal);
        const gst = toNumber(order?.gst);
        const platformFee = toNumber(order?.platform_fee);
        const deliveryCharge = toNumber(order?.delivery_charge);
        const total = toNumber(order?.total);

        return {
            items: safeItems,
            subtotal,
            gst,
            platformFee,
            deliveryCharge,
            total,
        };
    }, [order]);

    if (isLoading) {
        return (
            <main className="min-h-screen bg-[#fff7f6] px-4 py-10 md:px-6">
                <div className="mx-auto w-full max-w-5xl rounded-2xl border border-[#ffe1df] bg-white p-6 text-center text-[#6e4c4b]">
                    Loading your order tracking details...
                </div>
            </main>
        );
    }

    if (!order) {
        return (
            <main className="min-h-screen bg-[#fff7f6] px-4 py-10 md:px-6">
                <div className="mx-auto w-full max-w-5xl rounded-2xl border border-[#fecaca] bg-[#fff5f5] p-6 text-center font-semibold text-[#b91c1c]">
                    {errorMessage || 'Order not found.'}
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#fff7f6] px-4 py-6 text-[#1b1b1b] md:px-6 md:py-8">
            <section className="mx-auto w-full max-w-5xl">
                <header className="mb-5 rounded-2xl border border-[#ffd9d7] bg-white p-5 shadow-[0_12px_28px_rgba(183,18,42,0.08)] md:p-6">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#b7122a]">
                        Order Tracking
                    </p>
                    <h1 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">
                        Order #{order.id}
                    </h1>
                    <p className="mt-2 text-sm text-[#6e4c4b]">
                        Live order status updates are simulated on this page.
                    </p>
                </header>

                {isDelivered ? (
                    <div className="mb-5 rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-center text-sm font-bold text-[#166534] md:text-base">
                        Order Delivered! 🎉
                    </div>
                ) : null}

                {errorMessage ? (
                    <div className="mb-5 rounded-2xl border border-[#fecaca] bg-[#fff5f5] px-4 py-3 text-sm font-semibold text-[#b91c1c]">
                        {errorMessage}
                    </div>
                ) : null}

                <div className="grid gap-5 md:grid-cols-[1fr_1.2fr]">
                    <OrderTracker status={currentStatus} />

                    <OrderBill
                        items={billData.items}
                        subtotal={billData.subtotal}
                        gst={billData.gst}
                        platformFee={billData.platformFee}
                        deliveryCharge={billData.deliveryCharge}
                        total={billData.total}
                    />
                </div>
            </section>
        </main>
    );
}