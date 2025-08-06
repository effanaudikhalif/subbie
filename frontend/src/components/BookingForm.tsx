"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

interface BookingFormProps {
  listing: {
    id: string;
    title: string;
    price_per_night: number;
    user_id: string;
  };
  onSuccess?: (booking: any) => void;
  onCancel?: () => void;
}

interface BookingFormData {
  check_in_date: string;
  check_out_date: string;
  total_price: number;
  nights: number;
  guest_count: number;
}

function BookingForm({ listing, onSuccess, onCancel }: BookingFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<BookingFormData>({
    check_in_date: '',
    check_out_date: '',
    total_price: 0,
    nights: 0,
    guest_count: 1
  });

  // Reset form data
  const resetForm = () => {
    setFormData({
      check_in_date: '',
      check_out_date: '',
      total_price: 0,
      nights: 0,
      guest_count: 1
    });
    setError(null);
  };

  // Calculate total price when dates change
  useEffect(() => {
    if (formData.check_in_date && formData.check_out_date) {
      // Parse dates properly to avoid timezone issues
      const startParts = formData.check_in_date.split('-');
      const endParts = formData.check_out_date.split('-');
      
      const start = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
      const end = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]));
      
      // Calculate nights by getting the difference in days
      const timeDiff = end.getTime() - start.getTime();
      const nights = Math.round(timeDiff / (1000 * 60 * 60 * 24));
      
      if (nights > 0) {
        setFormData(prev => ({
          ...prev,
          nights,
          total_price: nights * listing.price_per_night
        }));
      }
    }
  }, [formData.check_in_date, formData.check_out_date, listing.price_per_night]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!formData.check_in_date || !formData.check_out_date) {
      setError('Please select both check-in and check-out dates.');
      return;
    }

    if (formData.nights <= 0) {
      setError('Please select valid dates.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create booking directly
      const response = await fetch('http://localhost:4000/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listing_id: listing.id,
          guest_id: user?.id,
          host_id: listing.user_id,
          check_in_date: formData.check_in_date,
          check_out_date: formData.check_out_date,
          total_price: formData.total_price
        }),
      });

      const booking = await response.json();

      if (!response.ok) {
        throw new Error(booking.error || booking.details || 'Failed to create booking');
      }

      console.log('Booking created successfully:', booking);
      onSuccess?.(booking);
      resetForm(); // Reset form after successful booking
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating the booking.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">${listing.price_per_night}</h3>
        <p className="text-gray-600 text-sm">per night</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Date Selection */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 mb-2">
            <p className="text-sm text-gray-600">
              📅 Bookings can be made up to 7 days in advance.
            </p>
          </div>
          <div>
            <label htmlFor="check_in_date" className="block text-sm font-medium text-gray-700 mb-1">
              Check-in
            </label>
            <input
              type="date"
              id="check_in_date"
              value={formData.check_in_date}
              onChange={(e) => setFormData(prev => ({ ...prev, check_in_date: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
              max={(() => {
                const maxDate = new Date();
                maxDate.setDate(maxDate.getDate() + 7);
                return maxDate.toISOString().split('T')[0];
              })()}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label htmlFor="check_out_date" className="block text-sm font-medium text-gray-700 mb-1">
              Check-out
            </label>
            <input
              type="date"
              id="check_out_date"
              value={formData.check_out_date}
              onChange={(e) => setFormData(prev => ({ ...prev, check_out_date: e.target.value }))}
              min={formData.check_in_date || new Date().toISOString().split('T')[0]}
              max={(() => {
                const maxDate = new Date();
                maxDate.setDate(maxDate.getDate() + 7);
                return maxDate.toISOString().split('T')[0];
              })()}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </div>

        {/* Guest Count */}
        <div>
          <label htmlFor="guest_count" className="block text-sm font-medium text-gray-700 mb-1">
            Number of Guests
          </label>
          <select
            id="guest_count"
            value={formData.guest_count}
            onChange={(e) => setFormData(prev => ({ ...prev, guest_count: parseInt(e.target.value) }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
              <option key={num} value={num}>{num} {num === 1 ? 'guest' : 'guests'}</option>
            ))}
          </select>
        </div>

        {/* Price Breakdown */}
        {formData.nights > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span>${listing.price_per_night} × {formData.nights} nights</span>
              <span>${(listing.price_per_night * formData.nights).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subly fee (1.5% guest + 1.5% host)</span>
              <span>${(formData.total_price * 0.03).toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Total</span>
              <span>${(formData.total_price * 1.03).toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || formData.nights <= 0}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating Booking...' : 'Request to Book'}
          </button>
        </div>

        <div className="text-xs text-gray-500 text-center">
          By requesting to book, you agree to the host's cancellation policy and Subly's terms of service.
        </div>
      </form>
    </div>
  );
}

export default BookingForm; 