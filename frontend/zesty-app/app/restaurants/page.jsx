"use client";

import { useEffect, useMemo, useState } from "react";

import FilterBar from "../../components/FilterBar";
import RestaurantGrid from "../../components/RestaurantGrid";

const API_BASE_URL = "http://localhost:8000/api";

function RestaurantSkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#F0E0E0] bg-white shadow-[0_8px_20px_rgba(27,27,27,0.04)]">
      <div className="aspect-[16/9] w-full animate-pulse bg-[#EAE7E7]" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-[#F0E0E0]" />
        <div className="h-5 w-1/3 animate-pulse rounded-full bg-[#FBE7E8]" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-[#F0E0E0]" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-[#F0E0E0]" />
      </div>
    </div>
  );
}

export default function RestaurantsPage() {
  const [areas, setAreas] = useState([]);
  const [cuisines, setCuisines] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [filters, setFilters] = useState({ search: "", area: "", cuisine: "" });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 400);

    return () => clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    let cancelled = false;

    async function fetchFilterData() {
      try {
        const [areasResponse, cuisinesResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/areas/`),
          fetch(`${API_BASE_URL}/cuisines/`),
        ]);

        if (!areasResponse.ok || !cuisinesResponse.ok) {
          throw new Error("Failed to load filter metadata");
        }

        const [areasData, cuisinesData] = await Promise.all([
          areasResponse.json(),
          cuisinesResponse.json(),
        ]);

        if (!cancelled) {
          setAreas(Array.isArray(areasData.areas) ? areasData.areas : []);
          setCuisines(Array.isArray(cuisinesData.cuisines) ? cuisinesData.cuisines : []);
        }
      } catch (error) {
        if (!cancelled) {
          setAreas([]);
          setCuisines([]);
        }
      }
    }

    fetchFilterData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchRestaurants() {
      setLoading(true);

      try {
        const params = new URLSearchParams();
        if (debouncedSearch.trim()) {
          params.set("search", debouncedSearch.trim());
        }
        if (filters.area) {
          params.set("area", filters.area);
        }
        if (filters.cuisine) {
          params.set("cuisine", filters.cuisine);
        }

        const queryString = params.toString();
        const url = queryString
          ? `${API_BASE_URL}/restaurants/?${queryString}`
          : `${API_BASE_URL}/restaurants/`;

        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          throw new Error("Failed to fetch restaurants");
        }

        const data = await response.json();
        const items = Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data)
            ? data
            : [];

        setRestaurants(items);
      } catch (error) {
        if (error.name !== "AbortError") {
          setRestaurants([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchRestaurants();

    return () => controller.abort();
  }, [debouncedSearch, filters.area, filters.cuisine]);

  const skeletonCards = useMemo(
    () => Array.from({ length: 6 }, (_, index) => <RestaurantSkeletonCard key={index} />),
    []
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(1100px_380px_at_-6%_-20%,rgba(183,18,42,0.12),transparent_62%),radial-gradient(920px_360px_at_110%_-14%,rgba(219,49,63,0.1),transparent_64%),linear-gradient(180deg,#fff7f6_0%,#fcf9f8_42%,#fcf9f8_100%)] text-[#1B1B1B]">
      <FilterBar
        areas={areas}
        cuisines={cuisines}
        onFilterChange={(nextFilters) => setFilters(nextFilters)}
      />

      <section className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-8">
        <h1 className="mb-6 text-2xl font-black tracking-tight text-[#1B1B1B] md:text-3xl">
          Restaurants in Mumbai
        </h1>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {skeletonCards}
          </div>
        ) : (
          <RestaurantGrid restaurants={restaurants} />
        )}
      </section>
    </main>
  );
}