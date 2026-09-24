// Curated food photography for the Zesty experience. Restaurant owners can
// upload their own photo (`restaurant.image`/`image_url`), but most demo
// and freshly-onboarded restaurants won't have one yet — falling back to a
// blank tile looked broken, so every card always has a real photo.
export const FOOD_FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=900&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=900&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=900&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1512152272829-e3139592d56f?w=900&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=900&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=900&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=900&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1541833523-c9d8fe6d3a8f?w=900&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1541014741259-de529411b96a?w=900&auto=format&fit=crop&q=80",
];

export const ZESTY_HERO_IMAGES = [
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1920&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1920&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&auto=format&fit=crop&q=80",
];

/** Deterministic pick so the same restaurant always gets the same fallback image. */
export function fallbackFoodImage(seed) {
  const numericSeed = Math.abs(Number(seed) || 0);
  const index = numericSeed % FOOD_FALLBACK_IMAGES.length;
  return FOOD_FALLBACK_IMAGES[index];
}
