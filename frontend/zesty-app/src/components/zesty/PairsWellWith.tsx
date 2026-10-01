import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { restaurantAPI } from '../../api/zesty';
import { miningAPI, type Combo } from '../../api/warehouse';
import { useCart } from '../../contexts/CartContext';
import type { MenuItem } from '../../types';
import { inr } from './OrderFlow';

const norm = (name: string) => name.trim().toLowerCase();

/**
 * "Goes well with": dishes this restaurant's customers usually add alongside
 * what's already in the cart, from the mined basket rules. Hidden when no
 * rule applies.
 */
const PairsWellWith: React.FC = () => {
  const { items, restaurant, addItem } = useCart();
  const [combos, setCombos] = useState<Combo[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [adding, setAdding] = useState<number | null>(null);

  useEffect(() => {
    if (!restaurant) return;
    let cancelled = false;
    Promise.all([miningAPI.combos(restaurant.id), restaurantAPI.getMenu(restaurant.id, {})])
      .then(([c, m]) => {
        if (cancelled) return;
        setCombos(c.combos);
        setMenu(m.results ?? []);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [restaurant]);

  const suggestions = useMemo(() => {
    const inCart = new Set(items.map((i) => norm(i.menuItem.name)));
    const byName = new Map(menu.filter((m) => m.is_available !== false).map((m) => [norm(m.name), m]));
    const picked = new Map<number, { item: MenuItem; because: string; confidence: number }>();
    for (const combo of [...combos].sort((a, b) => b.confidence - a.confidence)) {
      if (!combo.antecedent.every((name) => inCart.has(norm(name)))) continue;
      for (const name of combo.consequent) {
        const item = byName.get(norm(name));
        if (item && !inCart.has(norm(name)) && !picked.has(item.id)) {
          picked.set(item.id, { item, because: combo.antecedent.join(' + '), confidence: combo.confidence });
        }
      }
    }
    return [...picked.values()].slice(0, 3);
  }, [combos, menu, items]);

  if (!restaurant || suggestions.length === 0) return null;

  return (
    <div className="mt-6 rounded-xl bg-[#fbf5ee] p-4 ring-1 ring-[#efe2d4]">
      <p className="flex items-center gap-2 text-sm font-semibold text-zesty-redDark">
        <Sparkles className="h-4 w-4" aria-hidden="true" /> Goes well with your order
      </p>
      <ul className="mt-3 space-y-2">
        {suggestions.map(({ item, because, confidence }) => (
          <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2.5">
            <span className="min-w-0">
              <span className="block truncate font-medium">{item.name}</span>
              <span className="block text-xs text-[#7a6d63]">
                {Math.round(confidence * 100)}% of people who order {because} add this · {inr(item.price)}
              </span>
            </span>
            <button
              type="button"
              disabled={adding === item.id}
              onClick={async () => {
                setAdding(item.id);
                try { await addItem(item, 1, restaurant); } finally { setAdding(null); }
              }}
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-zesty-red px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-zesty-redDark disabled:opacity-60"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PairsWellWith;
