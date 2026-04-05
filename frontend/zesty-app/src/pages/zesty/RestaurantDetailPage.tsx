import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { restaurantAPI, orderAPI } from '../../api/zesty';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import type { Restaurant, MenuItem, Review } from '../../types';

const RestaurantDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem, items, restaurant: cartRestaurant, total } = useCart();
  const { isAuthenticated } = useAuth();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [showCartWarning, setShowCartWarning] = useState(false);
  const [pendingItem, setPendingItem] = useState<{ menuItem: MenuItem; quantity: number } | null>(null);
  
  // Review form state
  const [hasDeliveredOrder, setHasDeliveredOrder] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchRestaurantData(parseInt(id));
      checkDeliveredOrders(parseInt(id));
    }
  }, [id]);

  const fetchRestaurantData = async (restaurantId: number) => {
    try {
      setLoading(true);
      setError(null);

      const [restaurantData, menuData, reviewsData] = await Promise.all([
        restaurantAPI.retrieve(restaurantId),
        restaurantAPI.getMenu(restaurantId),
        restaurantAPI.getReviews(restaurantId),
      ]);

      setRestaurant(restaurantData);
      setMenuItems(menuData.results);
      setReviews(reviewsData.results);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load restaurant details');
    } finally {
      setLoading(false);
    }
  };

  const checkDeliveredOrders = async (restaurantId: number) => {
    if (!isAuthenticated) {
      setHasDeliveredOrder(false);
      return;
    }

    try {
      // Fetch user's delivered orders
      const ordersResponse = await orderAPI.list('delivered');
      const deliveredFromRestaurant = ordersResponse.results.some(
        order => order.restaurant === restaurantId
      );
      setHasDeliveredOrder(deliveredFromRestaurant);
    } catch (err) {
      console.error('Failed to check delivered orders:', err);
      setHasDeliveredOrder(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!id || !restaurant) return;

    setSubmittingReview(true);
    setReviewError(null);

    try {
      const newReview = await restaurantAPI.createReview(parseInt(id), {
        rating: reviewRating,
        comment: reviewComment,
      });

      // Add the new review to the list
      setReviews(prev => [newReview, ...prev]);
      
      // Update restaurant rating and review count
      setRestaurant(prev => prev ? {
        ...prev,
        review_count: prev.review_count + 1,
      } : null);

      // Reset form
      setReviewRating(5);
      setReviewComment('');
      setShowReviewForm(false);
      setHasDeliveredOrder(false); // User has now reviewed
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 
                      err.response?.data?.message ||
                      'Failed to submit review';
      
      // Handle unique constraint error (already reviewed)
      if (errorMsg.includes('already reviewed') || errorMsg.includes('unique constraint')) {
        setReviewError('You have already reviewed this restaurant.');
      } else {
        setReviewError(errorMsg);
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  const categories = ['All', ...Array.from(new Set(menuItems.map(item => item.category)))];

  const filteredMenuItems = selectedCategory === 'All'
    ? menuItems
    : menuItems.filter(item => item.category === selectedCategory);

  const groupedMenuItems = filteredMenuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  const handleQuantityChange = (menuItemId: number, value: number) => {
    setQuantities(prev => ({
      ...prev,
      [menuItemId]: Math.max(1, value),
    }));
  };

  const handleAddToCart = (menuItem: MenuItem) => {
    const quantity = quantities[menuItem.id] || 1;

    // Check if cart has items from a different restaurant
    if (cartRestaurant && cartRestaurant.id !== restaurant?.id) {
      setPendingItem({ menuItem, quantity });
      setShowCartWarning(true);
      return;
    }

    if (restaurant) {
      addItem(menuItem, quantity, restaurant);
      setQuantities(prev => ({ ...prev, [menuItem.id]: 1 }));
    }
  };

  const handleConfirmCartChange = () => {
    if (pendingItem && restaurant) {
      addItem(pendingItem.menuItem, pendingItem.quantity, restaurant);
      setQuantities(prev => ({ ...prev, [pendingItem.menuItem.id]: 1 }));
      setPendingItem(null);
      setShowCartWarning(false);
    }
  };

  const handleCancelCartChange = () => {
    setPendingItem(null);
    setShowCartWarning(false);
  };

  const getItemQuantityInCart = (menuItemId: number): number => {
    const cartItem = items.find(item => item.menuItem.id === menuItemId);
    return cartItem ? cartItem.quantity : 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error || 'Restaurant not found'}</p>
          <button
            onClick={() => navigate('/zesty/restaurants')}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Back to Restaurants
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Cart Warning Modal */}
      {showCartWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Replace cart items?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Your cart contains items from {cartRestaurant?.name}. Do you want to clear the cart and add items from {restaurant.name}?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelCartChange}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCartChange}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                Replace Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restaurant Banner */}
      <div className="h-64 bg-gray-200 dark:bg-gray-700 overflow-hidden">
        {restaurant.banner || restaurant.image ? (
          <img
            src={restaurant.banner || restaurant.image}
            alt={restaurant.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-gray-400 text-6xl">🍽️</span>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Restaurant Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {restaurant.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {restaurant.description}
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <span className="mr-1">🍴</span>
                  <span>{restaurant.cuisine_types}</span>
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <span className="mr-1">⭐</span>
                  <span>{restaurant.rating.toFixed(1)} ({restaurant.review_count} reviews)</span>
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <span className="mr-1">🕒</span>
                  <span>{restaurant.delivery_time_min}-{restaurant.delivery_time_max} min</span>
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <span className="mr-1">🚚</span>
                  <span>₹{restaurant.delivery_fee} delivery</span>
                </div>
              </div>
            </div>

            {/* Category Filter */}
            <div className="mb-6 overflow-x-auto">
              <div className="flex gap-2">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                      selectedCategory === category
                        ? 'bg-orange-500 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Items */}
            {Object.entries(groupedMenuItems).map(([category, items]) => (
              <div key={category} className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  {category}
                </h2>
                <div className="space-y-4">
                  {items.map(item => (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 flex gap-4"
                    >
                      {/* Item Image */}
                      <div className="w-24 h-24 flex-shrink-0 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-gray-400 text-2xl">🍽️</span>
                          </div>
                        )}
                      </div>

                      {/* Item Info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {item.name}
                              {item.is_vegetarian && <span className="ml-2 text-green-600">🌱</span>}
                              {item.is_vegan && <span className="ml-2 text-green-600">🌿</span>}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {item.description}
                            </p>
                          </div>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            ₹{item.price}
                          </p>
                        </div>

                        {/* Add to Cart Controls */}
                        {item.is_available ? (
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleQuantityChange(item.id, (quantities[item.id] || 1) - 1)}
                                className="w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                              >
                                -
                              </button>
                              <span className="w-8 text-center text-gray-900 dark:text-white font-medium">
                                {quantities[item.id] || 1}
                              </span>
                              <button
                                onClick={() => handleQuantityChange(item.id, (quantities[item.id] || 1) + 1)}
                                className="w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                              >
                                +
                              </button>
                            </div>
                            <button
                              onClick={() => handleAddToCart(item)}
                              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                            >
                              Add to Cart
                            </button>
                            {getItemQuantityInCart(item.id) > 0 && (
                              <span className="text-sm text-green-600 dark:text-green-400">
                                {getItemQuantityInCart(item.id)} in cart
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-red-600 dark:text-red-400 text-sm">
                            Currently unavailable
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Reviews Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Customer Reviews
              </h2>

              {/* Review Form */}
              {isAuthenticated && hasDeliveredOrder && (
                <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                  {!showReviewForm ? (
                    <button
                      onClick={() => setShowReviewForm(true)}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      Write a Review
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        Share your experience
                      </h3>

                      {/* Rating */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Rating
                        </label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              onClick={() => setReviewRating(star)}
                              className={`text-3xl transition-colors ${
                                star <= reviewRating
                                  ? 'text-yellow-500'
                                  : 'text-gray-300 dark:text-gray-600'
                              }`}
                              aria-label={`Rate ${star} stars`}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Comment */}
                      <div>
                        <label htmlFor="review-comment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Comment (optional)
                        </label>
                        <textarea
                          id="review-comment"
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="Tell us about your experience..."
                          rows={4}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                        />
                      </div>

                      {/* Error Message */}
                      {reviewError && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                          <p className="text-sm text-red-800 dark:text-red-200">{reviewError}</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-3">
                        <button
                          onClick={handleSubmitReview}
                          disabled={submittingReview}
                          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                          {submittingReview ? 'Submitting...' : 'Submit Review'}
                        </button>
                        <button
                          onClick={() => {
                            setShowReviewForm(false);
                            setReviewError(null);
                            setReviewRating(5);
                            setReviewComment('');
                          }}
                          disabled={submittingReview}
                          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Reviews List */}
              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.slice(0, 5).map(review => (
                    <div key={review.id} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {review.user_name}
                        </span>
                        <div className="flex items-center">
                          <span className="text-yellow-500 mr-1">⭐</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {review.rating.toFixed(1)}
                          </span>
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                          {review.comment}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        {new Date(review.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                  No reviews yet. Be the first to review!
                </p>
              )}
            </div>
          </div>

          {/* Cart Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 sticky top-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Your Cart
              </h2>
              {items.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  Your cart is empty
                </p>
              ) : (
                <>
                  <div className="space-y-3 mb-4">
                    {items.map(item => (
                      <div key={item.menuItem.id} className="flex justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300">
                          {item.quantity}x {item.menuItem.name}
                        </span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          ₹{(item.menuItem.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-4">
                    <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white">
                      <span>Total</span>
                      <span>₹{total.toFixed(2)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/zesty/cart')}
                    className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
                  >
                    View Cart & Checkout
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantDetailPage;
