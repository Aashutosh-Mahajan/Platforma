import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { eventAPI } from '../../api/eventra';
import type { Event } from '../../types';
import { useDebounce } from '../../hooks';

const CATEGORIES = [
  { id: 'all', label: 'All Events' },
  { id: 'movie', label: 'Movies' },
  { id: 'concert', label: 'Concerts' },
  { id: 'sports', label: 'Sports' },
  { id: 'theater', label: 'Theater' },
  { id: 'comedy', label: 'Comedy' },
  { id: 'expo', label: 'Expo' },
  { id: 'dining', label: 'Dining' },
];

const EventListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedCategory = searchParams.get('category') || 'all';
  const initialCategory = CATEGORIES.some((category) => category.id === requestedCategory)
    ? requestedCategory
    : 'all';
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300); // Use custom hook with 300ms delay
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('event_date');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Reset to first page when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    const nextCategory = CATEGORIES.some((category) => category.id === requestedCategory)
      ? requestedCategory
      : 'all';

    if (nextCategory !== selectedCategory) {
      setSelectedCategory(nextCategory);
      setPage(1);
    }
  }, [requestedCategory, selectedCategory]);

  const fetchEvents = useCallback(async (pageNum: number, append = false) => {
    try {
      setLoading(true);
      setError(null);

      const params: any = { page: pageNum };
      if (debouncedSearch) params.search = debouncedSearch;
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (minPrice) params.min_price = parseFloat(minPrice);
      if (maxPrice) params.max_price = parseFloat(maxPrice);
      if (sortBy) params.ordering = sortBy;

      const response = await eventAPI.list(params);
      
      if (append) {
        setEvents(prev => [...prev, ...response.results]);
      } else {
        setEvents(response.results);
      }
      
      setHasMore(!!response.next);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedCategory, dateFrom, dateTo, minPrice, maxPrice, sortBy]);

  useEffect(() => {
    fetchEvents(1, false);
  }, [fetchEvents]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (page === 1) {
        fetchEvents(1, false);
      }
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [fetchEvents, page]);

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchEvents(nextPage, true);
    }
  };

  const handleEventClick = (id: number, category: string) => {
    navigate(`/eventra/events/${id}?category=${encodeURIComponent(category)}`);
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    if (categoryId === 'all') {
      setSearchParams({});
    } else {
      setSearchParams({ category: categoryId });
    }
    setPage(1);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Events
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Discover amazing events happening near you
          </p>
        </div>

        {/* Category Tabs */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {CATEGORIES.map(category => (
              <button
                key={category.id}
                onClick={() => handleCategoryChange(category.id)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-purple-500 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search events or venues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Min Price
              </label>
              <input
                type="number"
                placeholder="₹0"
                value={minPrice}
                onChange={(e) => {
                  setMinPrice(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Price
              </label>
              <input
                type="number"
                placeholder="₹10000"
                value={maxPrice}
                onChange={(e) => {
                  setMaxPrice(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="event_date">Date (Earliest First)</option>
                <option value="-event_date">Date (Latest First)</option>
                <option value="-rating">Rating (High to Low)</option>
                <option value="rating">Rating (Low to High)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Event Grid */}
        {loading && page === 1 ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              No events found. Try adjusting your filters.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <div
                  key={event.id}
                  onClick={() => handleEventClick(event.id, event.category)}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                >
                  {/* Event Image */}
                  <div className="h-48 bg-gray-200 dark:bg-gray-700 overflow-hidden relative">
                    {event.image ? (
                      <img
                        src={event.image}
                        alt={event.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-gray-400 text-4xl">🎭</span>
                      </div>
                    )}
                    {/* Category Badge */}
                    <div className="absolute top-2 right-2 bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                      {event.category}
                    </div>
                  </div>

                  {/* Event Info */}
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      {event.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      📍 {event.venue_name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mb-3">
                      📅 {formatDate(event.event_date)}
                    </p>

                    {/* Rating and Reviews */}
                    <div className="flex items-center mb-3">
                      <span className="text-yellow-500 mr-1">⭐</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {event.rating.toFixed(1)}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                        ({event.review_count} reviews)
                      </span>
                    </div>

                    {/* Availability */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-gray-600 dark:text-gray-400">
                        {event.available_seats > 0 ? (
                          <span className="text-green-600 dark:text-green-400">
                            {event.available_seats} seats available
                          </span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400">
                            Sold Out
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EventListPage;
