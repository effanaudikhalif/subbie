"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

interface StripeAccountStatus {
  connected: boolean;
  account_id: string | null;
  status: 'not_connected' | 'pending' | 'active';
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  requirements?: any;
}

interface StripeConnectProps {
  onStatusChange?: (status: StripeAccountStatus) => void;
}

export default function StripeConnect({ onStatusChange }: StripeConnectProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<StripeAccountStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchStripeStatus();
    }
  }, [user]);

  const fetchStripeStatus = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:4000/api/stripe-connect/account/${user.id}`);
      const data = await response.json();
      
      if (response.ok) {
        setStatus(data);
        onStatusChange?.(data);
      } else {
        setError(data.error || 'Failed to fetch Stripe status');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectStripe = async () => {
    if (!user) return;
    
    try {
      setConnecting(true);
      setError(null);
      
      const response = await fetch('http://localhost:4000/api/stripe-connect/onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          email: user.email
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Redirect to Stripe onboarding
        window.location.href = data.url;
      } else {
        setError(data.error || 'Failed to start Stripe onboarding');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setConnecting(false);
    }
  };

  const handleReconnect = async () => {
    if (!user || !status?.account_id) return;
    
    try {
      setConnecting(true);
      setError(null);
      
      const response = await fetch(`http://localhost:4000/api/stripe-connect/account-link/${user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Redirect to Stripe onboarding
        window.location.href = data.url;
      } else {
        setError(data.error || 'Failed to reconnect Stripe account');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setConnecting(false);
    }
  };

  const handleResetAccount = async () => {
    if (!user) return;
    
    try {
      setResetting(true);
      setError(null);
      
      const response = await fetch(`http://localhost:4000/api/stripe-connect/reset/${user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Redirect to new Stripe onboarding
        window.location.href = data.url;
      } else {
        setError(data.error || 'Failed to reset Stripe account');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 shadow-lg max-w-md w-full">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded-lg w-3/4 mb-6"></div>
          <div className="h-6 bg-gray-200 rounded-lg w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded-lg w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Payment Setup</h1>
            <p className="text-gray-600 text-sm mt-1">Connect your Stripe account to receive payments</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-red-800 font-semibold">Connection Error</p>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {!status?.connected ? (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">Get Started with Payments</h3>
                  <p className="text-gray-700 leading-relaxed">
                    To receive payments for your bookings, you need to connect your Stripe account. 
                    This is a simple process that takes just a few minutes.
                  </p>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleConnectStripe}
              disabled={connecting}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {connecting ? (
                <div className="flex items-center justify-center gap-3">
                  <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Connecting to Stripe...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <span>Connect Stripe Account</span>
                </div>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Account Status Card */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-500 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">Stripe Account</h3>
                    <p className="text-gray-600 text-sm font-mono">
                      ID: {status.account_id?.slice(-8)}...
                    </p>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-full text-sm font-bold shadow-sm ${
                  status.status === 'active' 
                    ? 'bg-gradient-to-r from-green-400 to-green-500 text-white' 
                    : 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white'
                }`}>
                  {status.status === 'active' ? 'Active' : 'Pending'}
                </div>
              </div>

              {/* Status Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                  <span className="text-sm font-semibold text-gray-700">Details Submitted</span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
                    status.details_submitted ? 'bg-gradient-to-br from-green-400 to-green-500' : 'bg-gradient-to-br from-red-400 to-red-500'
                  }`}>
                    {status.details_submitted ? (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                  <span className="text-sm font-semibold text-gray-700">Charges Enabled</span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
                    status.charges_enabled ? 'bg-gradient-to-br from-green-400 to-green-500' : 'bg-gradient-to-br from-red-400 to-red-500'
                  }`}>
                    {status.charges_enabled ? (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                  <span className="text-sm font-semibold text-gray-700">Payouts Enabled</span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
                    status.payouts_enabled ? 'bg-gradient-to-br from-green-400 to-green-500' : 'bg-gradient-to-br from-red-400 to-red-500'
                  }`}>
                    {status.payouts_enabled ? (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Cards */}
            {status.status !== 'active' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-lg mb-2">Complete Account Setup</h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      Your Stripe account needs additional verification to receive payouts. 
                      Please complete the onboarding process to enable payments.
                    </p>
                    <button
                      onClick={handleReconnect}
                      disabled={connecting}
                      className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-yellow-600 hover:to-yellow-700 focus:outline-none focus:ring-4 focus:ring-yellow-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      {connecting ? 'Loading...' : 'Complete Setup'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {status.status === 'active' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg mb-2">Setup Complete!</h3>
                    <p className="text-gray-700 leading-relaxed">
                      Your Stripe account is fully configured and ready to receive payments.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Reset Account Button (for testing) */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">Testing Options</h4>
                  <p className="text-gray-600 text-sm">Reset your Stripe account for testing</p>
                </div>
                <button
                  onClick={handleResetAccount}
                  disabled={resetting}
                  className="bg-gray-600 text-white py-2 px-4 rounded-lg text-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {resetting ? 'Resetting...' : 'Reset Account'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 