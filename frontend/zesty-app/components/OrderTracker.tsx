export type OrderStatus =
    | 'placed'
    | 'confirmed'
    | 'preparing'
    | 'out_for_delivery'
    | 'delivered';

const TRACKER_STEPS: Array<{ key: OrderStatus; label: string }> = [
    { key: 'placed', label: 'Order Placed' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'preparing', label: 'Preparing' },
    { key: 'out_for_delivery', label: 'Out for Delivery' },
    { key: 'delivered', label: 'Delivered' },
];

type OrderTrackerProps = {
    status: OrderStatus;
};

export default function OrderTracker({ status }: OrderTrackerProps) {
    const activeIndex = TRACKER_STEPS.findIndex((step) => step.key === status);
    const normalizedActiveIndex = activeIndex === -1 ? 0 : activeIndex;

    return (
        <section className="rounded-2xl border border-[#ffd9d7] bg-white p-5 shadow-[0_10px_24px_rgba(183,18,42,0.08)] md:p-6">
            <h2 className="text-lg font-black tracking-tight text-[#1b1b1b]">Order Tracker</h2>

            <ol className="mt-4 space-y-0">
                {TRACKER_STEPS.map((step, index) => {
                    const isCompleted = index < normalizedActiveIndex;
                    const isActive = index === normalizedActiveIndex;
                    const isLastStep = index === TRACKER_STEPS.length - 1;

                    return (
                        <li key={step.key} className="flex gap-3">
                            <div className="flex w-7 flex-col items-center">
                                {isCompleted ? (
                                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#22c55e] text-xs font-black text-white">
                                        ✓
                                    </span>
                                ) : isActive ? (
                                    <span className="relative mt-0.5 inline-flex h-6 w-6 items-center justify-center">
                                        <span className="absolute inline-flex h-6 w-6 rounded-full bg-[#f97316] opacity-40 animate-ping" />
                                        <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-[#dc2626]" />
                                    </span>
                                ) : (
                                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#e5e7eb]" />
                                )}

                                {!isLastStep ? (
                                    <span
                                        className={`my-1 h-10 w-[2px] ${
                                            isCompleted ? 'bg-[#22c55e]' : 'bg-[#e5e7eb]'
                                        }`}
                                    />
                                ) : null}
                            </div>

                            <div className="pb-3 pt-0.5">
                                <p
                                    className={`text-sm font-bold ${
                                        isCompleted
                                            ? 'text-[#15803d]'
                                            : isActive
                                              ? 'text-[#dc2626]'
                                              : 'text-[#9ca3af]'
                                    }`}
                                >
                                    {step.label}
                                </p>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}