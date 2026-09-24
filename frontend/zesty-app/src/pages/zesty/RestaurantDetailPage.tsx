import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, Clock, Truck, Leaf, Minus, Plus, ShoppingBag } from 'lucide-react';
import { restaurantAPI, orderAPI } from '../../api/zesty';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { fallbackFoodImage } from '../../utils/foodImagery';
import type { Restaurant, MenuItem, Review } from '../../types';

const toNumber = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

type ApiLikeError = {
  response?: {
    data?: {
      detail?: string;
      message?: string;
    };
  };
};

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

  const readApiErrorMessage = (err: unknown, fallbackMessage: string): string => {
    if (typeof err !== 'object' || err === null) {
      return fallbackMessage;
    }

    const apiError = err as ApiLikeError;
    return apiError.response?.data?.detail || apiError.response?.data?.message || fallbackMessage;
  };

  const fetchRestaurantData = useCallback(async (restaurantId: number) => {
    try {
      setLoading(true);
      setError(null);

      const restaurantData = await restaurantAPI.retrieve(restaurantId);
      setRestaurant(restaurantData);

      const [menuResult, reviewsResult] = await Promise.allSettled([
        restaurantAPI.getMenu(restaurantId),
        restaurantAPI.getReviews(restaurantId),
      ]);

      setMenuItems(menuResult.status === 'fulfilled' ? menuResult.value.results : []);
      setReviews(reviewsResult.status === 'fulfilled' ? reviewsResult.value.results : []);
    } catch (err: unknown) {
      setError(readApiErrorMessage(err, 'Failed to load restaurant details'));
    } finally {
      setLoading(false);
    }
  }, []);

  const checkDeliveredOrders = useCallback(async (restaurantId: number) => {
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
  }, [isAuthenticated]);

  useEffect(() => {
    if (!id) {
      return;
    }

    const parsedRestaurantId = Number.parseInt(id, 10);
    if (Number.isNaN(parsedRestaurantId)) {
      setLoading(false);
      setError('Invalid restaurant identifier.');
      return;
    }

    fetchRestaurantData(parsedRestaurantId);
    checkDeliveredOrders(parsedRestaurantId);
  }, [id, fetchRestaurantData, checkDeliveredOrders]);

  const handleSubmitReview = async () => {
    if (!id || !restaurant) return;

    const normalizedRestaurantId = Number.parseInt(id, 10);
    if (!Number.isFinite(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      setReviewError('Invalid restaurant identifier. Please reload the page and try again.');
      return;
    }

    setSubmittingReview(true);
    setReviewError(null);

    try {
      const newReview = await restaurantAPI.createReview(normalizedRestaurantId, {
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
    } catch (err: unknown) {
      const errorMsg = readApiErrorMessage(err, 'Failed to submit review');
      
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

  const cartItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

  if (loading) {
    return (
      <div className="theme-zesty theme-zesty-page min-h-screen bg-[#FFF9F5] flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zesty-red"></div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="theme-zesty theme-zesty-page min-h-screen bg-[#FFF9F5] flex justify-center items-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Restaurant not found'}</p>
          <button
            onClick={() => navigate('/zesty')}
            className="px-5 py-2.5 bg-zesty-red text-white rounded-full font-semibold hover:bg-zesty-redDark"
          >
            Back to Restaurants
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="theme-zesty theme-zesty-page min-h-screen bg-[#FFF9F5] pb-24 lg:pb-0">
      {/* Cart Warning Modal */}
      {showCartWarning && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="font-zesty-display text-lg font-bold text-[#1C1C1C] mb-2">
              Replace cart items?
            </h3>
            <p className="text-[#696969] mb-4">
              Your cart contains items from {cartRestaurant?.name}. Do you want to clear the cart and add items from {restaurant.name}?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelCartChange}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCartChange}
                className="flex-1 px-4 py-2.5 bg-zesty-red text-white rounded-xl font-semibold hover:bg-zesty-redDark"
              >
                Replace Cart
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="sticky top-0 z-40 border-b border-[#F0E0E0] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate('/zesty')}
            className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
          >
            ← Back
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/zesty/cart')}
              className="inline-flex items-center gap-1.5 rounded-full border border-zesty-red/25 bg-zesty-red/5 px-4 py-1.5 text-sm font-semibold text-zesty-red hover:bg-zesty-red/10 transition-colors"
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              Cart ({cartItemsCount})
            </button>
            <button
              type="button"
              onClick={() => navigate('/zesty/checkout')}
              disabled={items.length === 0}
              className="rounded-full bg-zesty-red px-4 py-1.5 text-sm font-semibold text-white hover:bg-zesty-redDark disabled:cursor-not-allowed disabled:bg-gray-300 transition-colors"
            >
              Order Now
            </button>
          </div>
        </div>
      </div>

      {/* Restaurant Banner */}
      <div className="relative h-72 md:h-80 w-full overflow-hidden bg-[#F5E9DD]">
        <img
          src={restaurant.banner || restaurant.image || restaurant.image_url || fallbackFoodImage(restaurant.id)}
          alt={restaurant.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />

        <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
          {restaurant.is_verified && (
            <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-white backdrop-blur-sm">
              ✓ Verified Partner
            </span>
          )}
          <h1 className="font-zesty-display text-3xl font-extrabold text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)] md:text-5xl">
            {restaurant.name}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm font-semibold text-white/90">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[#1C1C1C]">
              <Star className="h-3.5 w-3.5 fill-[#1FA463] text-[#1FA463]" aria-hidden="true" />
              {toNumber(restaurant.rating, 0).toFixed(1)}
              <span className="font-normal text-[#696969]">({toNumber(restaurant.review_count, 0)})</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-zesty-gold" aria-hidden="true" />
              {restaurant.delivery_time_min}-{restaurant.delivery_time_max} min
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Truck className="h-4 w-4 text-zesty-gold" aria-hidden="true" />
              ₹{restaurant.delivery_fee} delivery
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Restaurant Info */}
            <div className="bg-white rounded-2xl border border-[#F0E0E0] shadow-sm p-6 mb-6">
              <p className="text-[#696969]">
                {restaurant.description}
              </p>
              <p className="mt-3 text-sm font-semibold text-zesty-red">
                {restaurant.cuisine_types}
              </p>
            </div>

            {/* Category Filter */}
            <div className="mb-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex gap-2">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-full whitespace-nowrap font-semibold text-sm transition-colors ${
                      selectedCategory === category
                        ? 'bg-zesty-red text-white shadow-[0_6px_16px_rgba(226,55,68,0.3)]'
                        : 'bg-white text-gray-700 border border-[#F0E0E0] hover:bg-gray-50'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Items */}
            {Object.entries(groupedMenuItems).map(([category, items], groupIndex) => (
              <div key={category} className="mb-8" id={groupIndex === 0 ? 'restaurant-menu' : undefined}>
                <h2 className="font-zesty-display text-2xl font-bold text-[#1C1C1C] mb-4">
                  {category}
                </h2>
                <div className="space-y-4">
                  {items.map(item => (
                    <div
                      key={item.id}
                      className="group bg-white rounded-2xl border border-[#F0E0E0] shadow-sm p-4 flex gap-4 transition-shadow hover:shadow-[0_10px_24px_rgba(0,0,0,0.08)]"
                    >
                      {/* Item Image */}
                      <div className="relative w-24 h-24 flex-shrink-0 overflow-hidden rounded-xl bg-[#F5E9DD]">
                        <img
                          src={item.image || fallbackFoodImage(item.id)}
                          alt={item.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                        {item.is_vegetarian && (
                          <span className="absolute left-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded border-[1.5px] border-[#1FA463] bg-white">
                            <Leaf className="h-2.5 w-2.5 text-[#1FA463]" strokeWidth={3} aria-hidden="true" />
                          </span>
                        )}
                      </div>

                      {/* Item Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="min-w-0">
                            <h3 className="text-lg font-bold text-[#1C1C1C]">
                              {item.name}
                            </h3>
                            <p className="text-sm text-[#696969] mt-1 line-clamp-2">
                              {item.description}
                            </p>
                          </div>
                          <p className="whitespace-nowrap text-lg font-bold text-zesty-red">
                            ₹{item.price}
                          </p>
                        </div>

                        {/* Add to Cart Controls */}
                        {item.is_available ? (
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1 rounded-full border border-[#F0E0E0] bg-[#FFF9F5] p-1">
                              <button
                                onClick={() => handleQuantityChange(item.id, (quantities[item.id] || 1) - 1)}
                                className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#1C1C1C] shadow-sm hover:bg-gray-100"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                              <span className="w-7 text-center text-sm font-bold text-[#1C1C1C]">
                                {quantities[item.id] || 1}
                              </span>
                              <button
                                onClick={() => handleQuantityChange(item.id, (quantities[item.id] || 1) + 1)}
                                className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#1C1C1C] shadow-sm hover:bg-gray-100"
                                aria-label="Increase quantity"
                              >
                                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            </div>
                            <button
                              onClick={() => handleAddToCart(item)}
                              className="rounded-full bg-zesty-red px-4 py-1.5 text-sm font-bold text-white shadow-[0_6px_14px_rgba(226,55,68,0.3)] transition-transform hover:-translate-y-0.5 hover:bg-zesty-redDark"
                            >
                              Add to Cart
                            </button>
                            {getItemQuantityInCart(item.id) > 0 && (
                              <span className="text-sm font-semibold text-[#1FA463]">
                                {getItemQuantityInCart(item.id)} in cart
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-red-600 text-sm font-semibold">
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
            <div className="bg-white rounded-2xl border border-[#F0E0E0] shadow-sm p-6">
              <h2 className="font-zesty-display text-2xl font-bold text-[#1C1C1C] mb-4">
                Customer Reviews
              </h2>

              {/* Review Form */}
              {isAuthenticated && hasDeliveredOrder && (
                <div className="mb-6 pb-6 border-b border-[#F0E0E0]">
                  {!showReviewForm ? (
                    <button
                      onClick={() => setShowReviewForm(true)}
                      className="rounded-full bg-zesty-red px-5 py-2 text-sm font-bold text-white shadow-[0_6px_14px_rgba(226,55,68,0.3)] transition-transform hover:-translate-y-0.5 hover:bg-zesty-redDark"
                    >
                      Write a Review
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-[#1C1C1C]">
                        Share your experience
                      </h3>

                      {/* Rating */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Rating
                        </label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              onClick={() => setReviewRating(star)}
                              className="transition-colors"
                              aria-label={`Rate ${star} stars`}
                            >
                              <Star
                                className={`h-8 w-8 ${star <= reviewRating ? 'fill-zesty-gold text-zesty-gold' : 'text-gray-300'}`}
                                aria-hidden="true"
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Comment */}
                      <div>
                        <label htmlFor="review-comment" className="block text-sm font-medium text-gray-700 mb-2">
                          Comment (optional)
                        </label>
                        <textarea
                          id="review-comment"
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="Tell us about your experience..."
                          rows={4}
                          className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-zesty-red focus:border-transparent resize-none"
                        />
                      </div>

                      {/* Error Message */}
                      {reviewError && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                          <p className="text-sm text-red-800">{reviewError}</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-3">
                        <button
                          onClick={handleSubmitReview}
                          disabled={submittingReview}
                          className="rounded-full bg-zesty-red px-5 py-2 text-sm font-bold text-white hover:bg-zesty-redDark disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
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
                          className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
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
                    <div key={review.id} className="border-b border-[#F0E0E0] pb-4 last:border-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-[#1C1C1C]">
                          {review.user_name}
                        </span>
                        <div className="flex items-center gap-1 rounded-full bg-[#FFF7F7] px-2 py-0.5">
                          <Star className="h-3.5 w-3.5 fill-zesty-gold text-zesty-gold" aria-hidden="true" />
                          <span className="text-sm font-semibold text-[#1C1C1C]">
                            {toNumber(review.rating, 0).toFixed(1)}
                          </span>
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-[#696969] text-sm mb-1">
                          {review.comment}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">
                        {new Date(review.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[#696969] text-center py-4">
                  No reviews yet. Be the first to review!
                </p>
              )}
            </div>
          </div>

          {/* Cart Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-[#F0E0E0] shadow-sm p-6 sticky top-20">
              <h2 className="font-zesty-display text-xl font-bold text-[#1C1C1C] mb-4 flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-zesty-red" aria-hidden="true" />
                Your Cart
              </h2>
              {items.length === 0 ? (
                <p className="text-[#696969] text-center py-8">
                  Your cart is empty
                </p>
              ) : (
                <>
                  <div className="space-y-3 mb-4">
                    {items.map(item => (
                      <div key={item.menuItem.id} className="flex justify-between text-sm">
                        <span className="text-[#3A3F44]">
                          {item.quantity}x {item.menuItem.name}
                        </span>
                        <span className="text-[#1C1C1C] font-semibold">
                          ₹{(item.menuItem.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-dashed border-[#E0C9B8] pt-4 mb-4">
                    <div className="flex justify-between text-lg font-bold text-[#1C1C1C]">
                      <span>Total</span>
                      <span className="text-zesty-red">₹{total.toFixed(2)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/zesty/cart')}
                    className="w-full px-4 py-3 bg-zesty-red text-white rounded-full hover:bg-zesty-redDark transition-colors font-bold shadow-[0_8px_18px_rgba(226,55,68,0.3)]"
                  >
                    View Cart
                  </button>
                  <button
                    onClick={() => navigate('/zesty/checkout')}
                    className="mt-3 w-full px-4 py-3 border border-zesty-red text-zesty-red rounded-full hover:bg-zesty-red/5 transition-colors font-bold"
                  >
                    Place Order
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {items.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 lg:hidden">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-2 shadow-[0_16px_30px_rgba(0,0,0,0.2)]">
            <button
              type="button"
              onClick={() => navigate('/zesty/cart')}
              className="rounded-xl bg-zesty-red/10 px-3 py-3 text-sm font-bold text-zesty-red"
            >
              {cartItemsCount} items · ₹{total.toFixed(2)}
            </button>
            <button
              type="button"
              onClick={() => navigate('/zesty/checkout')}
              className="rounded-xl bg-zesty-red px-3 py-3 text-sm font-bold text-white"
            >
              Order Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantDetailPage;
