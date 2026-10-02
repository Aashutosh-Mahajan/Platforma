/**
 * Cuisine lists arrive in two shapes: tidy comma lists from onboarding
 * ("Chinese, Dal") and raw lowercase tag strings from imported map data
 * ("cake;dessert;fried rice;sweet;sweets"). Both are kept as-is in the
 * database (search and the cuisine filters match against them); this only
 * shapes them for display.
 */

// Fragments imported tags use for a regional cuisine.
const ALIASES: Record<string, string> = {
  north: 'north indian',
  south: 'south indian',
};

const titleCase = (value: string) => value.replace(/\b\p{L}/gu, (c) => c.toUpperCase());

/** Clean, de-duplicated, title-cased cuisine names, in their original order. */
export function cuisineList(...sources: (string | null | undefined)[]): string[] {
  const tags = sources
    .flatMap((source) => (source ?? '').split(/[;,|]/))
    .map((tag) => tag.trim().toLowerCase().replace(/\s+/g, ' '))
    .filter(Boolean)
    .map((tag) => ALIASES[tag] ?? tag);

  const kept: string[] = [];
  for (const tag of tags) {
    const singular = tag.endsWith('s') ? tag.slice(0, -1) : tag;
    const duplicate = kept.some((k) => k === tag || k === singular || k === `${tag}s` || k.split(' ')[0] === tag);
    if (!duplicate) kept.push(tag);
  }
  return kept.map(titleCase);
}

/** "Cake · Dessert · Fried Rice +4" — the first few cuisines, then a count. */
export function formatCuisines(value: string | null | undefined, max = 3, fallback = 'Multi-cuisine'): string {
  const list = cuisineList(value);
  if (list.length === 0) return fallback;
  const shown = list.slice(0, max).join(' · ');
  return list.length > max ? `${shown} +${list.length - max}` : shown;
}
