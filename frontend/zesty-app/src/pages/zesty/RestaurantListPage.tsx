import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { restaurantAPI } from '../../api/zesty';
import type { Restaurant } from '../../types';
import { useDebounce } from '../../hooks';

const RestaurantListPage: React.FC = () => {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300); // Use custom hook with 300ms delay
  const [cuisineFilter, setCuisineFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [deliveryTimeFilter, setDeliveryTimeFilter] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Reset to first page when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const fetchRestaurants = useCallback(async (pageNum: number, append = false) => {
    try {
      setLoading(true);
      setError(null);

      const params: any = { page: pageNum };
      if (debouncedSearch) params.search = debouncedSearch;
      if (sortBy) params.ordering = sortBy;

      const response = await restaurantAPI.list(params);
      
      if (append) {
        setRestaurants(prev => [...prev, ...response.results]);
      } else {
        setRestaurants(response.results);
      }
      
      setHasMore(!!response.next);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load restaurants');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, sortBy]);

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

  const handleRestaurantClick = (id: number) => {
    navigate(`/zesty/restaurants/${id}`);
  };

  // Filter restaurants client-side for cuisine, rating, and delivery time
  const filteredRestaurants = restaurants.filter(restaurant => {
    if (cuisineFilter && !restaurant.cuisine_types.toLowerCase().includes(cuisineFilter.toLowerCase())) {
      return false;
    }
    if (ratingFilter && restaurant.rating < parseFloat(ratingFilter)) {
      return false;
    }
    if (deliveryTimeFilter && restaurant.delivery_time_max > parseInt(deliveryTimeFilter)) {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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
              Search restaurants or cuisines
            </label>
            <input
              id="restaurant-search"
              type="text"
              placeholder="Search restaurants or cuisines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search restaurants or cuisines"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label htmlFor="cuisine-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cuisine
              </label>
              <input
                id="cuisine-filter"
                type="text"
                placeholder="e.g., Italian, Chinese"
                value={cuisineFilter}
                onChange={(e) => setCuisineFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="rating-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Min Rating
              </label>
              <select
                id="rating-filter"
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">Any</option>
                <option value="4.5">4.5+</option>
                <option value="4.0">4.0+</option>
                <option value="3.5">3.5+</option>
                <option value="3.0">3.0+</option>
              </select>
            </div>

            <div>
              <label htmlFor="delivery-time-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Delivery Time
              </label>
              <select
                id="delivery-time-filter"
                value={deliveryTimeFilter}
                onChange={(e) => setDeliveryTimeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">Any</option>
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">60 min</option>
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
                <option value="-rating">Rating (High to Low)</option>
                <option value="rating">Rating (Low to High)</option>
                <option value="delivery_fee">Delivery Fee (Low to High)</option>
                <option value="-delivery_fee">Delivery Fee (High to Low)</option>
                <option value="delivery_time_max">Delivery Time (Fast First)</option>
                <option value="-delivery_time_max">Delivery Time (Slow First)</option>
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
        ) : filteredRestaurants.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg">
              No restaurants found. Try adjusting your filters.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6" role="list" aria-label="Restaurant listings">
              {filteredRestaurants.map((restaurant) => (
                <article
                  key={restaurant.id}
                  role="listitem"
                >
                  <button
                    onClick={() => handleRestaurantClick(restaurant.id)}
                    className="w-full text-left bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden focus:outline-none focus:ring-2 focus:ring-orange-500"
                    aria-label={`View ${restaurant.name} menu and details`}
                  >
                    {/* Restaurant Image */}
                    <div className="h-40 sm:h-48 bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      {restaurant.image ? (
                        <img
                          src={restaurant.image}
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
                        {restaurant.cuisine_types}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-500 mb-3 line-clamp-2">
                        {restaurant.description}
                      </p>

                      {/* Rating and Reviews */}
                      <div className="flex items-center mb-3">
                        <span className="text-yellow-500 mr-1" aria-hidden="true">⭐</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {restaurant.rating.toFixed(1)}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                          ({restaurant.review_count} reviews)
                        </span>
                      </div>

                      {/* Delivery Info */}
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <div className="flex items-center text-gray-600 dark:text-gray-400">
                          <span className="mr-1" aria-hidden="true">🕒</span>
                          <span>{restaurant.delivery_time_min}-{restaurant.delivery_time_max} min</span>
                        </div>
                        <div className="text-gray-900 dark:text-white font-medium">
                          ₹{restaurant.delivery_fee} delivery
                        </div>
                      </div>
                    </div>
                  </button>
                </article>
              ))}
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
