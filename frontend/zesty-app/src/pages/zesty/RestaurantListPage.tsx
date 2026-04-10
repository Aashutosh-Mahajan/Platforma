import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { restaurantAPI, type RestaurantListParams } from '../../api/zesty';
import type { Restaurant } from '../../types';
import { useDebounce } from '../../hooks';

type ApiLikeError = {
  response?: {
    data?: {
      detail?: string;
    };
  };
};

const AREA_OPTIONS = ['Bandra', 'Andheri', 'Juhu', 'Colaba', 'Dadar', 'Powai', 'Worli', 'Churchgate', 'Thane', 'Borivali'];
const CUISINE_OPTIONS = ['Indian', 'Chinese', 'Italian', 'Continental', 'Fast Food', 'Street Food', 'Seafood', 'Mughlai', 'South Indian', 'North Indian'];

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toRestaurantId = (value: unknown): number | null => {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const getRatingStars = (rating: number): string => {
  const safeRating = Number.isFinite(rating) ? rating : 0;
  const filledStars = Math.max(0, Math.min(5, Math.round(safeRating)));
  return `${'★'.repeat(filledStars)}${'☆'.repeat(5 - filledStars)}`;
};

const getPriceSymbols = (priceRange: number): string => {
  const safeRange = Math.max(1, Math.min(4, Math.round(priceRange || 1)));
  return '₹'.repeat(safeRange);
};

const RestaurantListPage: React.FC = () => {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [areaFilter, setAreaFilter] = useState('');
  const [cuisineFilter, setCuisineFilter] = useState('');
  const [vegOnlyFilter, setVegOnlyFilter] = useState('');
  const [priceRangeFilter, setPriceRangeFilter] = useState('');
  const [isOpenFilter, setIsOpenFilter] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Reset to first page when search/filters change.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, areaFilter, cuisineFilter, vegOnlyFilter, priceRangeFilter, isOpenFilter, sortBy]);

  const fetchRestaurants = useCallback(async (pageNum: number, append = false) => {
    try {
      setLoading(true);
      setError(null);

      const params: RestaurantListParams = { page: pageNum };
      if (debouncedSearch) params.search = debouncedSearch;
      if (areaFilter) params.area = areaFilter;
      if (cuisineFilter) params.cuisine = cuisineFilter;
      if (vegOnlyFilter) params.veg_only = vegOnlyFilter === 'true';
      if (priceRangeFilter) params.price_range = parseInt(priceRangeFilter, 10);
      if (isOpenFilter) params.is_open = isOpenFilter === 'true';
      if (sortBy) params.ordering = sortBy;

      const response = await restaurantAPI.list(params);
      
      if (append) {
        setRestaurants(prev => [...prev, ...response.results]);
      } else {
        setRestaurants(response.results);
      }
      
      setHasMore(!!response.next);
    } catch (err: unknown) {
      const apiError = err as ApiLikeError;
      setError(apiError.response?.data?.detail || 'Failed to load restaurants');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, areaFilter, cuisineFilter, vegOnlyFilter, priceRangeFilter, isOpenFilter, sortBy]);

  useEffect(() => {
    fetchRestaurants(1, false);
  }, [fetchRestaurants]);

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchRestaurants(nextPage, true);
    }
  };

  const handleRestaurantClick = (id: number | string) => {
    const normalizedId = toRestaurantId(id);
    if (normalizedId === null) {
      setError('Unable to open this restaurant right now. Please refresh and try again.');
      return;
    }

    navigate(`/zesty/restaurants/${normalizedId}`);
  };

  return (
    <div className="theme-zesty theme-zesty-page min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <header className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Restaurants
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Discover delicious food from local restaurants
          </p>
        </header>

        {/* Search and Filters */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-6 mb-6" aria-label="Search and filter restaurants">
          {/* Search */}
          <div className="mb-4">
            <label htmlFor="restaurant-search" className="sr-only">
              Search restaurants by name or description
            </label>
            <input
              id="restaurant-search"
              type="text"
              placeholder="Search restaurants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search restaurants"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label htmlFor="area-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Area
              </label>
              <select
                id="area-filter"
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">All Areas</option>
                {AREA_OPTIONS.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="cuisine-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cuisine
              </label>
              <select
                id="cuisine-filter"
                value={cuisineFilter}
                onChange={(e) => setCuisineFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">All Cuisines</option>
                {CUISINE_OPTIONS.map((cuisine) => (
                  <option key={cuisine} value={cuisine}>
                    {cuisine}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="veg-only-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Veg Preference
              </label>
              <select
                id="veg-only-filter"
                value={vegOnlyFilter}
                onChange={(e) => setVegOnlyFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">All</option>
                <option value="true">Veg Only</option>
                <option value="false">Non-Veg Included</option>
              </select>
            </div>

            <div>
              <label htmlFor="price-range-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Price Range
              </label>
              <select
                id="price-range-filter"
                value={priceRangeFilter}
                onChange={(e) => setPriceRangeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">All</option>
                <option value="1">₹</option>
                <option value="2">₹₹</option>
                <option value="3">₹₹₹</option>
                <option value="4">₹₹₹₹</option>
              </select>
            </div>

            <div>
              <label htmlFor="open-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Open Status
              </label>
              <select
                id="open-filter"
                value={isOpenFilter}
                onChange={(e) => setIsOpenFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">All</option>
                <option value="true">Open Now</option>
                <option value="false">Closed</option>
              </select>
            </div>

            <div>
              <label htmlFor="sort-by" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sort By
              </label>
              <select
                id="sort-by"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">Default</option>
                <option value="name">Name (A to Z)</option>
                <option value="-name">Name (Z to A)</option>
                <option value="-rating">Rating (High to Low)</option>
                <option value="rating">Rating (Low to High)</option>
                <option value="price_range">Price (Low to High)</option>
                <option value="-price_range">Price (High to Low)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6" role="alert">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Restaurant Grid */}
        {loading && page === 1 ? (
          <div className="flex justify-center items-center py-12" role="status" aria-live="polite">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            <span className="sr-only">Loading restaurants...</span>
          </div>
        ) : restaurants.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg">
              No restaurants found. Try adjusting your filters.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6" role="list" aria-label="Restaurant listings">
              {restaurants.map((restaurant) => {
                const imageSrc = restaurant.image_url || restaurant.image;
                const cuisineLabel = restaurant.cuisine || restaurant.cuisine_types;
                const ratingValue = toFiniteNumber(restaurant.rating, 0);
                const priceRangeValue = Number(restaurant.price_range || 1);
                const isOpen = typeof restaurant.is_open === 'boolean'
                  ? restaurant.is_open
                  : Boolean(restaurant.is_active);
                const hoursLabel = restaurant.hours || 'Hours not listed';

                return (
                <article key={restaurant.id} role="listitem">
                  <button
                    onClick={() => handleRestaurantClick(restaurant.id)}
                    className="w-full text-left bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden focus:outline-none focus:ring-2 focus:ring-orange-500"
                    aria-label={`View ${restaurant.name} menu and details`}
                  >
                    {/* Restaurant Image */}
                    <div className="h-40 sm:h-48 bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      {imageSrc ? (
                        <img
                          src={imageSrc}
                          alt={`${restaurant.name} restaurant`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" aria-hidden="true">
                          <span className="text-gray-400 text-4xl" role="img" aria-label="Restaurant icon">🍽️</span>
                        </div>
                      )}
                    </div>

                    {/* Restaurant Info */}
                    <div className="p-4">
                      <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        {restaurant.name}
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {cuisineLabel || 'Cuisine not listed'}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-500 mb-3 line-clamp-2">
                        {restaurant.description}
                      </p>

                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-amber-500 tracking-tight" aria-hidden="true">
                          {getRatingStars(ratingValue)}
                        </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {ratingValue.toFixed(1)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs sm:text-sm mb-3">
                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                          <span className={`h-2.5 w-2.5 rounded-full ${isOpen ? 'bg-green-500' : 'bg-red-500'}`} aria-hidden="true" />
                          <span>{isOpen ? 'Open' : 'Closed'}</span>
                        </div>
                        {restaurant.veg_only && (
                          <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                            Veg
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        <span>{restaurant.area || 'Mumbai'}</span>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {getPriceSymbols(priceRangeValue)}
                        </div>
                      </div>

                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {hoursLabel}
                      </p>
                    </div>
                  </button>
                </article>
                );
              })}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center mt-6 sm:mt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  aria-busy={loading}
                  className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default RestaurantListPage;
