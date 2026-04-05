import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventAPI, bookingAPI } from '../../api/eventra';
import { useBooking } from '../../contexts/BookingContext';
import { useAuth } from '../../contexts/AuthContext';
import type { Event, TicketType, EventReview } from '../../types';

const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setEvent, setTicketType } = useBooking();
  const { isAuthenticated } = useAuth();

  const [event, setEventData] = useState<Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [reviews, setReviews] = useState<EventReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasConfirmedBooking, setHasConfirmedBooking] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchEventData(parseInt(id));
      if (isAuthenticated) {
        checkUserBooking(parseInt(id));
      }
    }
  }, [id, isAuthenticated]);

  const fetchEventData = async (eventId: number) => {
    try {
      setLoading(true);
      setError(null);

      const [eventData, reviewsData] = await Promise.all([
        eventAPI.retrieve(eventId),
        eventAPI.getReviews(eventId),
      ]);

      setEventData(eventData);
      setTicketTypes(eventData.ticket_types || []);
      setReviews(reviewsData.results);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const checkUserBooking = async (eventId: number) => {
    try {
      const bookingsResponse = await bookingAPI.list();
      const confirmedBooking = bookingsResponse.results.find(
        booking => booking.event === eventId && booking.status === 'confirmed'
      );
      setHasConfirmedBooking(!!confirmedBooking);
    } catch (err) {
      console.log('Could not check user bookings');
    }
  };

  const handleSubmitReview = async () => {
    if (!id) return;

    setSubmittingReview(true);
    setReviewError(null);

    try {
      const newReview = await eventAPI.createReview(parseInt(id), {
        rating: reviewRating,
        comment: reviewComment,
      });

      // Add new review to the list
      setReviews([newReview, ...reviews]);
      
      // Reset form
      setShowReviewForm(false);
      setReviewRating(5);
      setReviewComment('');
      
      // Refresh event data to update rating
      fetchEventData(parseInt(id));
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.message ||
                          'Failed to submit review';
      
      // Handle unique constraint error
      if (errorMessage.includes('already reviewed') || errorMessage.includes('unique')) {
        setReviewError('You have already reviewed this event');
      } else {
        setReviewError(errorMessage);
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleBookTickets = (ticketType: TicketType) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/eventra/events/${id}` } });
      return;
    }

    if (!event) return;

    // Set booking context
    setEvent(event);
    setTicketType(ticketType);

    // Navigate to seat selection
    navigate(`/eventra/events/${id}/seats?ticketType=${ticketType.id}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error || 'Event not found'}</p>
          <button
            onClick={() => navigate('/eventra/events')}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
          >
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Event Banner */}
      <div className="h-96 bg-gray-200 dark:bg-gray-700 overflow-hidden relative">
        {event.banner || event.image ? (
          <img
            src={event.banner || event.image}
            alt={event.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-gray-400 text-6xl">🎭</span>
          </div>
        )}
        {/* Category Badge */}
        <div className="absolute top-4 right-4 bg-purple-500 text-white px-4 py-2 rounded-full text-sm font-medium">
          {event.category}
        </div>
        {/* Cancelled/Sold Out Badge */}
        {event.is_cancelled && (
          <div className="absolute top-4 left-4 bg-red-500 text-white px-4 py-2 rounded-full text-sm font-bold">
            EVENT CANCELLED
          </div>
        )}
        {!event.is_cancelled && event.available_seats === 0 && (
          <div className="absolute top-4 left-4 bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-bold">
            SOLD OUT
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Event Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                {event.name}
              </h1>
              
              <div className="flex flex-wrap gap-4 text-sm mb-4">
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <span className="mr-2">📍</span>
                  <div>
                    <div className="font-medium">{event.venue_name}</div>
                    <div className="text-xs">{event.address}</div>
                  </div>
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <span className="mr-2">📅</span>
                  <span>{formatDate(event.event_date)}</span>
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <span className="mr-2">⭐</span>
                  <span>{event.rating.toFixed(1)} ({event.review_count} reviews)</span>
                </div>
              </div>

              <div className="prose dark:prose-invert max-w-none">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  About this event
                </h2>
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">
                  {event.description}
                </p>
              </div>
            </div>

            {/* Reviews Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Reviews
              </h2>

              {/* Review Form */}
              {isAuthenticated && hasConfirmedBooking && (
                <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                  {!showReviewForm ? (
                    <button
                      onClick={() => setShowReviewForm(true)}
                      className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
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
                            >
                              ⭐
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Comment */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Comment (optional)
                        </label>
                        <textarea
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="Tell us about your experience..."
                          rows={4}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                        />
                      </div>

                      {/* Error Message */}
                      {reviewError && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                          <p className="text-red-800 dark:text-red-200 text-sm">{reviewError}</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-3">
                        <button
                          onClick={handleSubmitReview}
                          disabled={submittingReview}
                          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                          {submittingReview ? 'Submitting...' : 'Submit Review'}
                        </button>
                        <button
                          onClick={() => {
                            setShowReviewForm(false);
                            setReviewError(null);
                          }}
                          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

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

          {/* Ticket Types Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 sticky top-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Ticket Types
              </h2>

              {event.is_cancelled ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
                  <p className="text-red-800 dark:text-red-200 font-semibold">
                    This event has been cancelled
                  </p>
                </div>
              ) : event.available_seats === 0 ? (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 text-center">
                  <p className="text-orange-800 dark:text-orange-200 font-semibold">
                    All tickets are sold out
                  </p>
                </div>
              ) : ticketTypes.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No ticket types available
                </p>
              ) : (
                <div className="space-y-4">
                  {ticketTypes.map(ticketType => (
                    <div
                      key={ticketType.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {ticketType.name}
                        </h3>
                        <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                          ₹{ticketType.price}
                        </p>
                      </div>

                      {ticketType.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {ticketType.description}
                        </p>
                      )}

                      {ticketType.benefits && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">
                          ✓ {ticketType.benefits}
                        </p>
                      )}

                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {ticketType.quantity_available > 0 ? (
                            <span className="text-green-600 dark:text-green-400">
                              {ticketType.quantity_available} available
                            </span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400">
                              Sold Out
                            </span>
                          )}
                        </span>
                      </div>

                      <button
                        onClick={() => handleBookTickets(ticketType)}
                        disabled={ticketType.quantity_available === 0}
                        className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                      >
                        {ticketType.quantity_available === 0 ? 'Sold Out' : 'Book Tickets'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailPage;
