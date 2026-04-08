import { useEffect, useMemo, useState } from "react";

import FilterBar from "../components/FilterBar";
import RestaurantGrid from "../components/RestaurantGrid";

const API_BASE_URL = "http://localhost:8000/api";
const LOCATION_STORAGE_KEY = "platforma_last_location";
const HERO_SECTIONS = [
  {
    id: "gold-flash-sale",
    imageUrl: "/zesty/Images/Hero1.jpeg",
  },
  {
    id: "free-delivery-first-order",
    imageUrl: "/zesty/Images/Hero%202.jpeg",
  },
  {
    id: "flat-50-delivery",
    imageUrl: "/zesty/Images/Hero%203.jpeg",
  },
];

const HERO_CAROUSEL_SLIDES = [
  HERO_SECTIONS[HERO_SECTIONS.length - 1],
  ...HERO_SECTIONS,
  HERO_SECTIONS[0],
];

const PRIMARY_CUISINE_STRIP_ITEMS = [
  { id: "all", label: "All", emoji: "🍽️", cuisineKey: "" },
  { id: "desserts", label: "Desserts", emoji: "🍰", cuisineKey: "dessert" },
  { id: "north-indian", label: "North Indian", emoji: "🍛", cuisineKey: "north indian" },
  { id: "ice-cream", label: "Ice Cream", emoji: "🍨", cuisineKey: "ice cream" },
  { id: "pav-bhaji", label: "Pav Bhaji", emoji: "🥘", cuisineKey: "pav bhaji" },
  { id: "sweets", label: "Sweets", emoji: "🍬", cuisineKey: "sweet" },
  { id: "jain-food", label: "Jain Food", emoji: "🥗", cuisineKey: "jain" },
  { id: "south-indian", label: "South Indian", emoji: "🥥", cuisineKey: "south indian" },
  { id: "waffles", label: "Waffles", emoji: "🧇", cuisineKey: "waffle" },
  { id: "maharashtrian", label: "Maharashtrian", emoji: "🍲", cuisineKey: "maharashtrian" },
  { id: "paneer", label: "Paneer", emoji: "🧀", cuisineKey: "paneer" },
  { id: "sandwich", label: "Sandwich", emoji: "🥪", cuisineKey: "sandwich" },
  { id: "cake", label: "Cake", emoji: "🎂", cuisineKey: "cake" },
  { id: "dosa", label: "Dosa", emoji: "🥞", cuisineKey: "dosa" },
  { id: "chinese", label: "Chinese", emoji: "🥡", cuisineKey: "chinese" },
  { id: "fried-rice", label: "Fried Rice", emoji: "🍚", cuisineKey: "fried rice" },
  { id: "pizza", label: "Pizza", emoji: "🍕", cuisineKey: "pizza" },
];

const EXTRA_CUISINE_DROPDOWN_ITEMS = [
  { id: "kulfi", label: "Kulfi", cuisineKey: "kulfi" },
  { id: "khichdi", label: "Khichdi", cuisineKey: "khichdi" },
  { id: "gujarati", label: "Gujarati", cuisineKey: "gujarati" },
  { id: "pastry", label: "Pastry", cuisineKey: "pastry" },
  { id: "thali", label: "Thali", cuisineKey: "thali" },
  { id: "chaap", label: "Chaap", cuisineKey: "chaap" },
  { id: "rajasthani", label: "Rajasthani", cuisineKey: "rajasthani" },
  { id: "chaat", label: "Chaat", cuisineKey: "chaat" },
  { id: "idli", label: "Idli", cuisineKey: "idli" },
  { id: "dal", label: "Dal", cuisineKey: "dal" },
  { id: "rolls", label: "Rolls", cuisineKey: "roll" },
  { id: "dal-khichdi", label: "Dal Khichdi", cuisineKey: "dal khichdi" },
  { id: "vada", label: "Vada", cuisineKey: "vada" },
  { id: "kulche", label: "Kulche", cuisineKey: "kulche" },
  { id: "paratha", label: "Paratha", cuisineKey: "paratha" },
  { id: "cheesecake", label: "Cheesecake", cuisineKey: "cheesecake" },
  { id: "doughnut", label: "Doughnut", cuisineKey: "doughnut" },
  { id: "sundae", label: "Sundae", cuisineKey: "sundae" },
  { id: "pulao", label: "Pulao", cuisineKey: "pulao" },
  { id: "chole", label: "Chole", cuisineKey: "chole" },
  { id: "tiramisu", label: "Tiramisu", cuisineKey: "tiramisu" },
  { id: "rasgulla-shake", label: "Rasgulla Shake", cuisineKey: "rasgulla shake" },
  { id: "brownie", label: "Brownie", cuisineKey: "brownie" },
  { id: "manchurian", label: "Manchurian", cuisineKey: "manchurian" },
  { id: "soup", label: "Soup", cuisineKey: "soup" },
  { id: "chole-bhature", label: "Chole Bhature", cuisineKey: "chole bhature" },
  { id: "vada-pav", label: "Vada Pav", cuisineKey: "vada pav" },
  { id: "samosa", label: "Samosa", cuisineKey: "samosa" },
  { id: "aloo-paratha", label: "Aloo Paratha", cuisineKey: "aloo paratha" },
];

const ALL_CUISINE_ITEMS = [
  ...PRIMARY_CUISINE_STRIP_ITEMS,
  ...EXTRA_CUISINE_DROPDOWN_ITEMS,
];

function RestaurantSkeletonCard({ index }) {
  return (
    <div
      key={index}
      className="h-full overflow-hidden rounded-xl border border-[#F0E0E0] bg-[#FFF7F7]"
    >
      <div className="aspect-[16/9] w-full animate-pulse bg-[#E5E5E5]" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-[#E5E5E5]" />
        <div className="h-5 w-1/3 animate-pulse rounded-full bg-[#FFE3E5]" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-[#E5E5E5]" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-[#E5E5E5]" />
      </div>
    </div>
  );
}

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState([]);
  const [areas, setAreas] = useState([]);
  const [currentLocation, setCurrentLocation] = useState("");
  const [carouselIndex, setCarouselIndex] = useState(1);
  const [isCarouselAnimating, setIsCarouselAnimating] = useState(true);
  const [showStickySearch, setShowStickySearch] = useState(false);
  const [touchStartX, setTouchStartX] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    area: "",
    foodPreference: "all",
  });
  const [activeCuisineStrip, setActiveCuisineStrip] = useState("all");
  const [showMoreCuisines, setShowMoreCuisines] = useState(false);
  const [quickFilters, setQuickFilters] = useState({
    nearFast: false,
    under200: false,
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const activeHeroIndex =
    (carouselIndex - 1 + HERO_SECTIONS.length) % HERO_SECTIONS.length;
  const activeHero = HERO_SECTIONS[activeHeroIndex];
  const isImageHero = Boolean(activeHero.imageUrl);

  const visibleRestaurants = useMemo(() => {
    const selectedCuisine = ALL_CUISINE_ITEMS.find((item) => item.id === activeCuisineStrip);
    const cuisineKey = (selectedCuisine?.cuisineKey || "").toLowerCase();

    return restaurants.filter((restaurant) => {
      const cuisineText = `${restaurant.name || ""} ${restaurant.cuisine || ""} ${restaurant.cuisine_types || ""} ${restaurant.description || ""}`.toLowerCase();
      const ratingValue = Number(restaurant.rating || 0);
      const priceRangeValue = Number(restaurant.price_range || 2);

      if (cuisineKey && !cuisineText.includes(cuisineKey)) {
        return false;
      }

      if (quickFilters.nearFast && ratingValue < 4) {
        return false;
      }

      if (quickFilters.under200 && priceRangeValue > 2) {
        return false;
      }

      return true;
    });
  }, [
    activeCuisineStrip,
    quickFilters.nearFast,
    quickFilters.under200,
    restaurants,
  ]);

  const moveToNextHero = () => {
    setIsCarouselAnimating(true);
    setCarouselIndex((prev) => prev + 1);
  };

  const moveToPreviousHero = () => {
    setIsCarouselAnimating(true);
    setCarouselIndex((prev) => prev - 1);
  };

  const handleHeroCarouselTransitionEnd = () => {
    if (carouselIndex === 0) {
      setIsCarouselAnimating(false);
      setCarouselIndex(HERO_SECTIONS.length);
    } else if (carouselIndex === HERO_SECTIONS.length + 1) {
      setIsCarouselAnimating(false);
      setCarouselIndex(1);
    }
  };

  useEffect(() => {
    // Fail-safe wrap reset in case transitionend is skipped during route changes.
    if (carouselIndex !== 0 && carouselIndex !== HERO_SECTIONS.length + 1) {
      return;
    }

    const wrapTarget = carouselIndex === 0 ? HERO_SECTIONS.length : 1;
    const fallbackTimer = window.setTimeout(() => {
      setIsCarouselAnimating(false);
      setCarouselIndex(wrapTarget);
    }, 900);

    return () => window.clearTimeout(fallbackTimer);
  }, [carouselIndex]);

  useEffect(() => {
    // Guard against any unexpected out-of-range index that would blank the track.
    if (carouselIndex < 0 || carouselIndex > HERO_SECTIONS.length + 1) {
      setIsCarouselAnimating(false);
      setCarouselIndex(1);
    }
  }, [carouselIndex]);

  const handleHeroTouchStart = (event) => {
    setTouchStartX(event.touches[0]?.clientX ?? null);
  };

  const handleHeroTouchEnd = (event) => {
    if (touchStartX === null) {
      return;
    }

    const touchEndX = event.changedTouches[0]?.clientX ?? touchStartX;
    const swipeDistance = touchEndX - touchStartX;
    const swipeThreshold = 40;

    if (swipeDistance > swipeThreshold) {
      moveToPreviousHero();
    } else if (swipeDistance < -swipeThreshold) {
      moveToNextHero();
    }

    setTouchStartX(null);
  };

  useEffect(() => {
    const cachedLocation = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (cachedLocation) {
      setCurrentLocation(cachedLocation);
    }

    if (!("geolocation" in navigator)) {
      if (!cachedLocation) {
        setCurrentLocation("Location unavailable");
      }
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let resolvedLocation = "";

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
            {
              headers: {
                "Accept-Language": "en",
              },
            },
          );

          if (response.ok) {
            const data = await response.json();
            const address = data?.address || {};

            const locality =
              address.suburb ||
              address.neighbourhood ||
              address.city_district ||
              address.town ||
              address.city ||
              address.state_district;

            const city =
              address.city ||
              address.town ||
              address.village ||
              address.county ||
              address.state;

            if (locality && city && locality.toLowerCase() !== city.toLowerCase()) {
              resolvedLocation = `${locality}, ${city}`;
            } else {
              resolvedLocation = locality || city || "";
            }
          }
        } catch (_err) {
          // Keep fallback behavior when reverse geocoding fails.
        }

        if (!resolvedLocation) {
          resolvedLocation = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        }

        setCurrentLocation(resolvedLocation);
        localStorage.setItem(LOCATION_STORAGE_KEY, resolvedLocation);
      },
      () => {
        if (!cachedLocation) {
          setCurrentLocation("Location unavailable");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 400);

    return () => clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      moveToNextHero();
    }, 3500);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!isCarouselAnimating) {
      const timer = window.setTimeout(() => {
        setIsCarouselAnimating(true);
      }, 30);

      return () => window.clearTimeout(timer);
    }
  }, [isCarouselAnimating]);

  useEffect(() => {
    const handleScroll = () => {
      const threshold = Math.max(360, window.innerHeight * 0.75);
      setShowStickySearch(window.scrollY > threshold);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchAreas() {
      try {
        const areasResponse = await fetch(`${API_BASE_URL}/areas/`);

        if (!areasResponse.ok) {
          throw new Error("Failed to fetch areas");
        }

        const areasData = await areasResponse.json();

        if (!cancelled) {
          setAreas(Array.isArray(areasData.areas) ? areasData.areas : []);
        }
      } catch (err) {
        if (!cancelled) {
          setAreas([]);
        }
      }
    }

    fetchAreas();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchRestaurants() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();
        const selectedCuisine = ALL_CUISINE_ITEMS.find((item) => item.id === activeCuisineStrip);
        const cuisineKey = (selectedCuisine?.cuisineKey || "").trim().toLowerCase();

        if (debouncedSearch.trim()) {
          params.set("search", debouncedSearch.trim());
        }
        if (filters.area) {
          params.set("area", filters.area);
        }
        if (filters.foodPreference === "veg") {
          params.set("veg_only", "true");
        }
        if (cuisineKey) {
          params.set("cuisine_tag", cuisineKey);
        }
        if (quickFilters.nearFast) {
          params.set("min_rating", "4");
        }
        if (quickFilters.under200) {
          params.set("max_price_range", "2");
        }

        const query = params.toString();
        const url = query
          ? `${API_BASE_URL}/restaurants/?${query}`
          : `${API_BASE_URL}/restaurants/`;

        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          throw new Error("Failed to fetch restaurants");
        }

        const data = await response.json();
        const fetchedRestaurants = Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data)
            ? data
            : [];

        setRestaurants(fetchedRestaurants);
      } catch (err) {
        if (err.name !== "AbortError") {
          setRestaurants([]);
          setError("Something went wrong");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchRestaurants();

    return () => controller.abort();
  }, [
    activeCuisineStrip,
    debouncedSearch,
    filters.area,
    filters.foodPreference,
    quickFilters.nearFast,
    quickFilters.under200,
  ]);

  const selectedMoreCuisine = EXTRA_CUISINE_DROPDOWN_ITEMS.find(
    (item) => item.id === activeCuisineStrip,
  );

  return (
    <main className="min-h-screen bg-[#FFFFFF]">
      <div
        className={`fixed left-0 right-0 z-50 px-4 transition-all duration-300 md:px-6 lg:px-8 ${
          showStickySearch ? "top-3 translate-y-0 opacity-100" : "top-3 -translate-y-3 opacity-0 pointer-events-none"
        }`}
      >
        <div className="mx-auto w-full max-w-7xl">
          <input
            type="text"
            value={filters.search}
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
            placeholder="Search restaurants or cuisines..."
            className="w-full rounded-2xl border-2 border-white/95 bg-white px-5 py-3.5 text-base font-medium text-[#1C1C1C] placeholder:text-[#7D7D7D] outline-none shadow-[0_14px_30px_rgba(0,0,0,0.24)] transition-all duration-200 focus:border-[#FFE37A] focus:ring-4 focus:ring-white/35"
          />
        </div>
      </div>

      <section
        className="relative h-screen min-h-[640px] w-full overflow-hidden"
        onTouchStart={handleHeroTouchStart}
        onTouchEnd={handleHeroTouchEnd}
      >
        <div className="absolute inset-0 overflow-hidden">
          <div
            className={`flex h-full ${
              isCarouselAnimating
                ? "transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                : ""
            }`}
            style={{
              width: `${HERO_CAROUSEL_SLIDES.length * 100}%`,
              transform: `translateX(-${(carouselIndex * 100) / HERO_CAROUSEL_SLIDES.length}%)`,
            }}
            onTransitionEnd={handleHeroCarouselTransitionEnd}
          >
            {HERO_CAROUSEL_SLIDES.map((slide, index) => (
              <div
                key={`${slide.id}-${index}`}
                className="relative h-full overflow-hidden bg-[#F6E9CC]"
                style={{
                  width: `${100 / HERO_CAROUSEL_SLIDES.length}%`,
                }}
              >
                <img
                  src={slide.imageUrl}
                  alt="Zesty hero offer"
                  className="h-full w-full object-cover object-center"
                  loading={index <= 1 ? "eager" : "lazy"}
                />
              </div>
            ))}
          </div>
        </div>

        <div
          className={`absolute inset-0 ${isImageHero ? "opacity-0" : "opacity-20"}`}
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, #FFFFFF 1px, transparent 0)",
            backgroundSize: "14px 14px",
          }}
        />

        {!isImageHero && (
          <div
            className="absolute -bottom-16 left-[-6%] h-[320px] w-[320px] opacity-55"
            style={{
              background: activeHero.burst,
              clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
            }}
          />
        )}

        <div className="relative z-30 w-full">
          <FilterBar
            areas={areas}
            filters={filters}
            onFilterChange={setFilters}
            currentLocation={currentLocation}
          />

          {!showStickySearch && (
            <div className="mx-auto w-full max-w-7xl px-4 pt-3 md:px-6 lg:px-8">
              <input
                type="text"
                value={filters.search}
                onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                placeholder="Search restaurants or cuisines..."
                className="w-full rounded-2xl border-2 border-white/95 bg-white px-5 py-3.5 text-base font-medium text-[#1C1C1C] placeholder:text-[#7D7D7D] outline-none shadow-[0_14px_30px_rgba(0,0,0,0.24)] transition-all duration-200 focus:border-[#FFE37A] focus:ring-4 focus:ring-white/35"
              />
            </div>
          )}
        </div>

        <div className="relative z-20 mx-auto flex h-full w-full max-w-7xl flex-col justify-between px-4 pb-8 pt-44 md:px-6 md:pb-10 md:pt-52 lg:px-8">
          {isImageHero ? (
            <div />
          ) : (
            <div className="max-w-[560px] text-white">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/80">
                Zesty Specials
              </p>
              <h2 className="mt-3 text-[64px] font-black uppercase leading-[0.9] tracking-tight drop-shadow-[0_4px_0_rgba(0,0,0,0.22)] md:text-[92px]">
                {activeHero.title}
              </h2>
              <h3 className="mt-1 text-5xl font-black uppercase leading-none tracking-tight drop-shadow-[0_4px_0_rgba(0,0,0,0.22)] md:text-7xl">
                {activeHero.offer}
              </h3>
              <p className="mt-2 text-2xl font-semibold text-white/95 md:text-4xl">
                {activeHero.subtitle}
              </p>
              <p className="mt-4 text-sm font-medium text-white/90 md:text-lg">{activeHero.note}</p>

              <button
                type="button"
                className="mt-7 rounded-full bg-black px-8 py-3 text-base font-bold text-white shadow-[0_10px_20px_rgba(0,0,0,0.35)] transition-transform duration-200 hover:-translate-y-0.5"
              >
                {activeHero.cta}
              </button>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 pb-2">
            {HERO_SECTIONS.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setIsCarouselAnimating(true);
                  setCarouselIndex(index + 1);
                }}
                className={`h-2.5 rounded-full transition-all duration-200 ${
                  index === activeHeroIndex ? "w-8 bg-white" : "w-2.5 bg-white/50"
                }`}
                aria-label={`Go to hero slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 lg:px-8">
        <div className="flex gap-5 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setQuickFilters((prev) => ({ ...prev, under200: !prev.under200 }))}
            className={`min-w-[96px] rounded-2xl p-2 text-left transition-all duration-200 ${
              quickFilters.under200
                ? "bg-[#D4F0E2]"
                : "bg-gradient-to-br from-[#7AB4F7] via-[#6A9FF2] to-[#4A7AE0]"
            }`}
          >
            <p className="text-[10px] font-black uppercase tracking-[0.08em] text-white">Meals Under</p>
            <p className="mt-0.5 text-3xl font-black text-white">₹250</p>
            <p className="mt-0.5 text-xs font-semibold text-white">Explore</p>
          </button>

          {PRIMARY_CUISINE_STRIP_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveCuisineStrip(item.id)}
              className="min-w-[96px] text-center"
            >
              <div className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white shadow-[0_8px_18px_rgba(0,0,0,0.12)]">
                <span className="text-[36px]" aria-hidden="true">{item.emoji}</span>
              </div>
              <p className="mt-2 truncate text-base font-semibold text-[#263238]">{item.label}</p>
              <div
                className={`mx-auto mt-2 h-1 rounded-full transition-all duration-200 ${
                  activeCuisineStrip === item.id ? "w-12 bg-[#1FA463]" : "w-0 bg-transparent"
                }`}
              />
            </button>
          ))}

          <button
            type="button"
            onClick={() => setShowMoreCuisines((prev) => !prev)}
            className="min-w-[96px] text-center"
          >
            <div className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white shadow-[0_8px_18px_rgba(0,0,0,0.12)]">
              <span className="text-[30px]" aria-hidden="true">➕</span>
            </div>
            <p className="mt-2 truncate text-base font-semibold text-[#263238]">
              {selectedMoreCuisine ? selectedMoreCuisine.label : "See all"}
            </p>
            <div
              className={`mx-auto mt-2 h-1 rounded-full transition-all duration-200 ${
                showMoreCuisines || selectedMoreCuisine ? "w-12 bg-[#1FA463]" : "w-0 bg-transparent"
              }`}
            />
          </button>
        </div>

        {showMoreCuisines && (
          <div className="mt-3 rounded-2xl border border-[#D7D7D7] bg-white p-3 shadow-[0_8px_18px_rgba(0,0,0,0.08)]">
            <p className="px-1 text-sm font-semibold text-[#3A3F44]">More cuisines</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {EXTRA_CUISINE_DROPDOWN_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveCuisineStrip(item.id);
                    setShowMoreCuisines(false);
                  }}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
                    activeCuisineStrip === item.id
                      ? "border-[#17A35C] bg-[#E8F8EF] text-[#0D7C43]"
                      : "border-[#D7D7D7] bg-white text-[#263238] hover:bg-[#F6F6F6]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setQuickFilters((prev) => ({ ...prev, nearFast: !prev.nearFast }))}
            className={`rounded-xl border px-5 py-2.5 text-base font-semibold transition-colors duration-200 ${
              quickFilters.nearFast
                ? "border-[#17A35C] bg-[#E8F8EF] text-[#0D7C43]"
                : "border-[#D7D7D7] bg-white text-[#263238]"
            }`}
          >
            ⚡ Near & Fast
          </button>
          <button
            type="button"
            onClick={() => setQuickFilters((prev) => ({ ...prev, under200: !prev.under200 }))}
            className={`rounded-xl border px-5 py-2.5 text-base font-semibold transition-colors duration-200 ${
              quickFilters.under200
                ? "border-[#17A35C] bg-[#E8F8EF] text-[#0D7C43]"
                : "border-[#D7D7D7] bg-white text-[#263238]"
            }`}
          >
            Under ₹200
          </button>
          <button
            type="button"
            className="rounded-xl border border-[#D7D7D7] bg-white px-5 py-2.5 text-base font-semibold text-[#263238]"
          >
            Schedule
          </button>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:px-8">
        <h1 className="text-[30px] font-semibold uppercase tracking-[0.18em] text-[#6B6F72]">
          Recommended For You
        </h1>

        <div className="mt-6">
          {error ? (
            <div className="rounded-xl border border-[#F0E0E0] bg-[#FFF7F7] px-5 py-4 text-[#696969]">
              Something went wrong
            </div>
          ) : loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <RestaurantSkeletonCard key={index} index={index} />
              ))}
            </div>
          ) : (
            <RestaurantGrid restaurants={visibleRestaurants} />
          )}
        </div>
      </section>
    </main>
  );
}
