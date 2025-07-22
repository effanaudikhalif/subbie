"use client";
import React, { useEffect, useState } from 'react';
import type { User } from '../types/User';

interface Review {
  listing_id: string;
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
  reviewer?: User | null | undefined;
  reviewee?: User | null | undefined;
}

const ReviewsSection: React.FC<ReviewsSectionProps> = ({ listingId, reviewer, reviewee }) => {
  const reviewerId = reviewer?.id;
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    cleanliness_rating: 0,
    accuracy_rating: 0,
    communication_rating: 0,
    location_rating: 0,
    value_rating: 0,
    comment: '',
  });
  const [averageRatings, setAverageRatings] = useState<{
    cleanliness: number;
    accuracy: number;
    communication: number;
    location: number;
    value: number;
    overall: number;
  } | null>(null);
  // Add editing state
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);

  // Helper to reload reviews
  const fetchReviews = async () => {
    try {
      // Fetch reviews for this listing
      const response = await fetch(`http://localhost:4000/api/host-reviews`);
      if (response.ok) {
        const allReviews = await response.json();
        // Filter reviews for this listing by listing_id
        const listingReviews = allReviews.filter((review: Review) => review.listing_id === listingId);
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
        } else {
          setAverageRatings({
            cleanliness: 0,
            accuracy: 0,
            communication: 0,
            location: 0,
            value: 0,
            overall: 0
          });
        }
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  // Replace useEffect to use fetchReviews helper
  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId]);

  // Handle review form submission
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewer || !reviewee || !reviewer.id || !reviewee.id) {
      alert('You must be logged in and viewing a valid listing to submit a review.');
      return;
    }
    // Prevent submission if any rating is 0
    const { cleanliness_rating, accuracy_rating, communication_rating, location_rating, value_rating } = reviewForm;
    if ([cleanliness_rating, accuracy_rating, communication_rating, location_rating, value_rating].some(r => r === 0)) {
      alert('Please provide a rating for all categories.');
      return;
    }
    try {
      const res = await fetch('http://localhost:4000/api/host-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listingId,
          reviewer_id: reviewer.id,
          reviewee_id: reviewee.id,
          cleanliness_rating: reviewForm.cleanliness_rating,
          accuracy_rating: reviewForm.accuracy_rating,
          communication_rating: reviewForm.communication_rating,
          location_rating: reviewForm.location_rating,
          value_rating: reviewForm.value_rating,
          comment: reviewForm.comment,
        })
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to submit review.');
        return;
      }
      // Success: close modal, reset form, refresh reviews
      setShowReviewModal(false);
      setReviewForm({
        cleanliness_rating: 0,
        accuracy_rating: 0,
        communication_rating: 0,
        location_rating: 0,
        value_rating: 0,
        comment: '',
      });
      setEditingReviewId(null); // Reset editing state
      setLoading(true);
      await fetchReviews();
    } catch (err) {
      alert('Failed to submit review.');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading reviews...</p>
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

  const ReviewCard = ({ review, truncate, reviewerId }: { review: Review; truncate?: boolean; reviewerId?: string }) => {
    // Calculate average rating for this review
    const averageRating = (
      review.cleanliness_rating + 
      review.accuracy_rating + 
      review.communication_rating + 
      review.location_rating + 
      review.value_rating
    ) / 5;

    return (
      <div className="border border-black rounded-lg p-4 relative">
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
            </div>
            <p className="text-sm text-gray-600 mb-2">
              {formatDate(review.created_at)}
            </p>
            <p className={truncate ? "text-gray-700 text-sm line-clamp-2 overflow-hidden" : "text-gray-700 text-sm"}>{review.comment}</p>
          </div>
        </div>
        {/* Top right: stars, average, edit icon */}
        <div className="absolute top-4 right-4 flex items-center">
          <span className="mr-1 font-medium text-gray-900">{averageRating.toFixed(1)}</span>
          {renderStars(averageRating)}
          {reviewerId && review.reviewer_id === reviewerId && (
            <button
              className="bg-white hover:bg-gray-100 text-black p-2 rounded-full border border-gray-300 ml-2 transition-colors"
              title="Edit review"
              onClick={() => {
                setReviewForm({
                  cleanliness_rating: review.cleanliness_rating,
                  accuracy_rating: review.accuracy_rating,
                  communication_rating: review.communication_rating,
                  location_rating: review.location_rating,
                  value_rating: review.value_rating,
                  comment: review.comment,
                });
                setEditingReviewId(review.id);
                setShowReviewModal(true);
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="black" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  };

  // Add a reusable StarRating component for the form
  const StarRating: React.FC<{
    value: number;
    onChange: (val: number) => void;
    label: string;
  }> = ({ value, onChange, label }) => (
    <div className="mb-2">
      <label className="block text-gray-700 font-medium mb-1">{label}</label>
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className="focus:outline-none"
            onClick={() => onChange(star)}
            aria-label={`Set ${label} to ${star} star${star > 1 ? 's' : ''}`}
          >
            <span className={star <= value ? 'text-black text-2xl' : 'text-gray-300 text-2xl'}>★</span>
          </button>
        ))}
      </div>
    </div>
  );

  // Always show the ratings summary, even if there are no reviews
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
                {renderStars(averageRatings?.overall || 0)}
                <p className="text-base text-gray-600 mt-2">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>
          {/* Category Ratings */}
          <div className="flex-1">
            <div className="grid grid-cols-5 gap-0">
              {[
                { name: 'Cleanliness', rating: averageRatings?.cleanliness, icon: (
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                ) },
                { name: 'Accuracy', rating: averageRatings?.accuracy, icon: (
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) },
                { name: 'Communication', rating: averageRatings?.communication, icon: (
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                ) },
                { name: 'Location', rating: averageRatings?.location, icon: (
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ) },
                { name: 'Value', rating: averageRatings?.value, icon: (
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                ) },
              ].map((category) => (
                <div key={category.name} className="flex flex-col items-center text-center">
                  <div className="mb-2">
                    {category.icon}
                  </div>
                  <div className="text-sm text-gray-700 mb-4">
                    {category.name}
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {(category.rating ?? 0).toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* If no reviews, show the message */}
        {reviews.length === 0 && (
          <div className="flex justify-start mt-6">
            <button
              className="bg-white border border-black text-black px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              onClick={() => setShowReviewModal(true)}
            >
              Write a review
            </button>
          </div>
        )}

        {/* Write a Review Popup */}
        {showReviewModal && (
          <div className="fixed inset-0 backdrop-blur-sm bg-white/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-lg w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Write a Review</h3>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form className="p-6 space-y-4" onSubmit={handleReviewSubmit}>
                <StarRating
                  label="Cleanliness"
                  value={reviewForm.cleanliness_rating}
                  onChange={val => setReviewForm(f => ({ ...f, cleanliness_rating: val }))}
                />
                <StarRating
                  label="Accuracy"
                  value={reviewForm.accuracy_rating}
                  onChange={val => setReviewForm(f => ({ ...f, accuracy_rating: val }))}
                />
                <StarRating
                  label="Communication"
                  value={reviewForm.communication_rating}
                  onChange={val => setReviewForm(f => ({ ...f, communication_rating: val }))}
                />
                <StarRating
                  label="Location"
                  value={reviewForm.location_rating}
                  onChange={val => setReviewForm(f => ({ ...f, location_rating: val }))}
                />
                <StarRating
                  label="Value"
                  value={reviewForm.value_rating}
                  onChange={val => setReviewForm(f => ({ ...f, value_rating: val }))}
                />
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Comment</label>
                  <textarea
                    value={reviewForm.comment}
                    onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))}
                    className="w-full border border-gray-300 border-[1px] rounded-lg px-3 py-2 focus:border-black focus:outline-none text-black"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="ml-2 bg-white border border-black text-black px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Submit Review
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Individual Reviews */}
        {reviews.length > 0 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {reviews.slice(0, 4).map((review) => (
                <ReviewCard key={review.id} review={review} truncate reviewerId={reviewerId} />
              ))}
            </div>
            {/* Show all reviews and Write a review buttons */}
            {reviews.length > 4 ? (
              <div className="col-span-1 md:col-span-2 flex justify-start gap-4 mt-6">
                <button
                  onClick={() => setShowAllReviews(true)}
                  className="bg-white border border-black text-black px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Show all {reviews.length} reviews
                </button>
                {(!reviewer || !reviewee || reviewer.id !== reviewee.id) && (
                  <button
                    className="bg-white border border-black text-black px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    onClick={() => setShowReviewModal(true)}
                  >
                    Write a review
                  </button>
                )}
              </div>
            ) : (
              <div className="flex justify-start mt-6">
                {(!reviewer || !reviewee || reviewer.id !== reviewee.id) && (
                  <button
                    className="bg-white border border-black text-black px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    onClick={() => setShowReviewModal(true)}
                  >
                    Write a review
                  </button>
                )}
              </div>
            )}
          </div>
        )}
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
              <div className="grid grid-cols-1 gap-6">
                {reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} reviewerId={reviewerId} />
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