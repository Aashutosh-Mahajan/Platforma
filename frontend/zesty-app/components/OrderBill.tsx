type OrderBillItem = {
    id?: number | string;
    name: string;
    price: number | string;
    quantity: number | string;
};

type OrderBillProps = {
    items: OrderBillItem[];
    subtotal: number | string;
    gst: number | string;
    platformFee: number | string;
    deliveryCharge: number | string;
    total: number | string;
};

function toNumber(value: number | string | undefined | null): number {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
}

function formatCurrency(value: number | string): string {
    return `₹${toNumber(value).toFixed(2)}`;
}

export default function OrderBill({
    items,
    subtotal,
    gst,
    platformFee,
    deliveryCharge,
    total,
}: OrderBillProps) {
    return (
        <section className="rounded-2xl border border-[#eceff1] bg-white p-5 shadow-[0_10px_22px_rgba(16,24,40,0.08)] md:p-6">
            <h2 className="text-lg font-black tracking-tight text-[#1b1b1b]">Order Bill</h2>

            <div className="mt-4 space-y-3">
                {items.map((item) => {
                    const price = toNumber(item.price);
                    const quantity = toNumber(item.quantity);
                    const lineTotal = price * quantity;

                    return (
                        <div
                            key={item.id ?? `${item.name}-${price}`}
                            className="flex items-start justify-between gap-4 rounded-xl border border-[#f3f4f6] bg-[#fcfcfc] px-3 py-2.5"
                        >
                            <p className="text-sm font-semibold text-[#1f2937]">
                                {item.name} × {quantity}
                            </p>
                            <p className="text-sm font-bold text-[#111827]">{formatCurrency(lineTotal)}</p>
                        </div>
                    );
                })}
            </div>

            <dl className="mt-5 space-y-2 text-sm text-[#475467]">
                <div className="flex items-center justify-between">
                    <dt>Subtotal</dt>
                    <dd>{formatCurrency(subtotal)}</dd>
                </div>
                <div className="flex items-center justify-between">
                    <dt>GST</dt>
                    <dd>{formatCurrency(gst)}</dd>
                </div>
                <div className="flex items-center justify-between">
                    <dt>Platform Fee</dt>
                    <dd>{formatCurrency(platformFee)}</dd>
                </div>
                <div className="flex items-center justify-between">
                    <dt>Delivery Charge</dt>
                    <dd>{formatCurrency(deliveryCharge)}</dd>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-[#e5e7eb] pt-2 text-base font-black text-[#111827]">
                    <dt>Total</dt>
                    <dd>{formatCurrency(total)}</dd>
                </div>
            </dl>
        </section>
    );
}