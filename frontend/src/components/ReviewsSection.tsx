"use client";
import React, { useEffect, useState } from 'react';

interface Review {
  id: string;
  reviewer_id: string;
  reviewee_id: string;
  booking_id: string;
  cleanliness_rating: number;
  accuracy_rating: number;
  communication_rating: number;
  location_rating: number;
  value_rating: number;
  comment: string;
  created_at: string;
  reviewer_name?: string;
  reviewer_avatar?: string;
}

interface ReviewsSectionProps {
  listingId: string;
}

const ReviewsSection: React.FC<ReviewsSectionProps> = ({ listingId }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [averageRatings, setAverageRatings] = useState<{
    cleanliness: number;
    accuracy: number;
    communication: number;
    location: number;
    value: number;
    overall: number;
  } | null>(null);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        // Fetch reviews for this listing
        const response = await fetch(`http://localhost:4000/api/host-reviews`);
        if (response.ok) {
          const allReviews = await response.json();
          
          // Filter reviews for this listing by getting bookings for this listing
          const bookingsResponse = await fetch(`http://localhost:4000/api/bookings`);
          if (bookingsResponse.ok) {
            const allBookings = await bookingsResponse.json();
            const listingBookings = allBookings.filter((booking: any) => booking.listing_id === listingId);
            const listingBookingIds = listingBookings.map((booking: any) => booking.id);
            
            const listingReviews = allReviews.filter((review: Review) => 
              listingBookingIds.includes(review.booking_id)
            );

            // Fetch reviewer names
            const reviewsWithNames = await Promise.all(
              listingReviews.map(async (review: Review) => {
                try {
                  const userResponse = await fetch(`http://localhost:4000/api/users/${review.reviewer_id}`);
                  if (userResponse.ok) {
                    const user = await userResponse.json();
                    return { ...review, reviewer_name: user.name, reviewer_avatar: user.avatar_url };
                  }
                } catch (error) {
                  console.error('Error fetching reviewer:', error);
                }
                return review;
              })
            );

            setReviews(reviewsWithNames);

            // Calculate average ratings
            if (reviewsWithNames.length > 0) {
              const totals = reviewsWithNames.reduce((acc, review) => ({
                cleanliness: acc.cleanliness + review.cleanliness_rating,
                accuracy: acc.accuracy + review.accuracy_rating,
                communication: acc.communication + review.communication_rating,
                location: acc.location + review.location_rating,
                value: acc.value + review.value_rating,
              }), { cleanliness: 0, accuracy: 0, communication: 0, location: 0, value: 0 });

              const count = reviewsWithNames.length;
              setAverageRatings({
                cleanliness: totals.cleanliness / count,
                accuracy: totals.accuracy / count,
                communication: totals.communication / count,
                location: totals.location / count,
                value: totals.value / count,
                overall: (totals.cleanliness + totals.accuracy + totals.communication + totals.location + totals.value) / (count * 5)
              });
            }
          }
        }
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [listingId]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading reviews...</p>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews yet</h3>
        <p className="text-gray-500">Be the first to review this listing!</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasPartialStar = rating % 1 !== 0;
    const partialStarPercentage = (rating % 1) * 100;
    
    return (
      <div className="flex text-lg">
        {[1, 2, 3, 4, 5].map((star) => {
          if (star <= fullStars) {
            return <span key={star} className="text-black">★</span>;
          } else if (star === fullStars + 1 && hasPartialStar) {
            return (
              <span key={star} className="relative">
                <span className="text-gray-300">★</span>
                <span 
                  className="absolute top-0 left-0 text-black overflow-hidden"
                  style={{ width: `${partialStarPercentage}%` }}
                >
                  ★
                </span>
              </span>
            );
          } else {
            return <span key={star} className="text-gray-300">★</span>;
          }
        })}
      </div>
    );
  };

  const ReviewCard = ({ review }: { review: Review }) => {
    // Calculate average rating for this review
    const averageRating = (
      review.cleanliness_rating + 
      review.accuracy_rating + 
      review.communication_rating + 
      review.location_rating + 
      review.value_rating
    ) / 5;

    return (
      <div className="border border-black rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            {review.reviewer_avatar ? (
              <img 
                src={review.reviewer_avatar} 
                alt={review.reviewer_name || 'Reviewer'} 
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <span className="text-gray-600 font-medium">
                {(review.reviewer_name || 'R')[0].toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h5 className="font-medium text-gray-900">
                {review.reviewer_name || 'Anonymous'}
              </h5>
              <div className="flex items-center text-sm">
                <span className="mr-1 font-medium text-gray-900">
                  {averageRating.toFixed(1)}
                </span>
                {renderStars(averageRating)}
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              {formatDate(review.created_at)}
            </p>
            <p className="text-gray-700 text-sm">{review.comment}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-8">
        {/* Overall Rating and Category Ratings */}
        <div className="flex items-center">
          {/* Overall Rating */}
          <div className="flex items-center mr-12">
            <div className="flex items-center">
              <span className="text-6xl font-bold text-black">{averageRatings?.overall.toFixed(1)}</span>
              <div className="ml-4">
                {averageRatings?.overall && renderStars(averageRatings.overall)}
                <p className="text-base text-gray-600 mt-2">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>

          {/* Category Ratings */}
          <div className="flex-1">
            <div className="grid grid-cols-5 gap-0">
              {[
                { 
                  name: 'Cleanliness', 
                  rating: averageRatings?.cleanliness, 
                  icon: (
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )
                },
                { 
                  name: 'Accuracy', 
                  rating: averageRatings?.accuracy, 
                  icon: (
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )
                },
                { 
                  name: 'Communication', 
                  rating: averageRatings?.communication, 
                  icon: (
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  )
                },
                { 
                  name: 'Location', 
                  rating: averageRatings?.location, 
                  icon: (
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )
                },
                { 
                  name: 'Value', 
                  rating: averageRatings?.value, 
                  icon: (
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  )
                },
              ].map((category) => (
                <div key={category.name} className="flex flex-col items-center text-center">
                  <div className="mb-2">
                    {category.icon}
                  </div>
                  <div className="text-sm text-gray-700 mb-4">
                    {category.name}
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {category.rating?.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Individual Reviews */}
        <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reviews.slice(0, 4).map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}

          {reviews.length > 4 && (
            <div className="col-span-1 md:col-span-2 flex">
              <button 
                onClick={() => setShowAllReviews(true)}
                className="bg-white border border-black text-black px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Show all {reviews.length} reviews
              </button>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* All Reviews Popup */}
      {showAllReviews && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">All reviews</h3>
                <button 
                  onClick={() => setShowAllReviews(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReviewsSection; 