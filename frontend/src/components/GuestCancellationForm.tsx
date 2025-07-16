import React, { useState } from 'react';

interface GuestCancellationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string, details: string) => void;
  isLoading?: boolean;
}

const guestCancellationReasons = [
  { value: 'change_of_plans', label: 'Change of plans' },
  { value: 'found_alternative', label: 'Found alternative accommodation' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'travel_dates_changed', label: 'Travel dates changed' },
  { value: 'budget_constraints', label: 'Budget constraints' },
  { value: 'personal_emergency', label: 'Personal emergency' },
  { value: 'other', label: 'Other' }
];

export default function GuestCancellationForm({ isOpen, onClose, onSubmit, isLoading = false }: GuestCancellationFormProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [details, setDetails] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedReason) {
      onSubmit(selectedReason, details);
    }
  };

  const handleClose = () => {
    setSelectedReason('');
    setDetails('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Blur overlay */}
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50" onClick={handleClose} />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Cancel Booking</h2>
            <p className="text-gray-600">Please provide a reason for cancelling this booking</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Reason Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Cancellation Reason *
              </label>
              <div className="space-y-2">
                {guestCancellationReasons.map((reason) => (
                  <label key={reason.value} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="reason"
                      value={reason.value}
                      checked={selectedReason === reason.value}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="text-sm text-gray-700">{reason.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Additional Details */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Details (Optional)
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Please provide any additional details about the cancellation..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={4}
                maxLength={500}
              />
              <div className="text-xs text-gray-500 mt-1 text-right">
                {details.length}/500 characters
              </div>
            </div>

            {/* Refund Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-800">
                    Your refund will be processed according to the host's cancellation policy. You may be eligible for a full or partial refund.
                  </p>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                Keep Booking
              </button>
              <button
                type="submit"
                disabled={!selectedReason || isLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Cancelling...' : 'Cancel Booking'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
} 