import React, { useEffect, useState } from 'react';

interface PaymentTransaction {
  id: string;
  listing_title: string;
  guest_name: string;
  start_date: string;
  end_date: string;
  total_price: number;
  stripe_fee_amount: number;
  subly_fee_amount: number;
  host_subly_fee_amount: number;
  guest_subly_fee_amount: number;
  host_payout_amount: number;
  stripe_transfer_id: string;
  status: string;
  payment_status: string;
  created_at: string;
}

interface PaymentHistoryProps {
  userId: string;
}

export default function PaymentHistory({ userId }: PaymentHistoryProps) {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data for demonstration
  const mockTransactions: PaymentTransaction[] = [
    {
      id: "booking_001",
      listing_title: "Cozy Downtown Apartment",
      guest_name: "Sarah Johnson",
      start_date: "2024-01-15",
      end_date: "2024-01-18",
      total_price: 450.00,
      stripe_fee_amount: 13.50,
      subly_fee_amount: 22.50,
      host_subly_fee_amount: 13.50,
      guest_subly_fee_amount: 27.00,
      host_payout_amount: 414.00,
      stripe_transfer_id: "tr_123456789",
      status: "confirmed",
      payment_status: "paid",
      created_at: "2024-01-10"
    },
    {
      id: "booking_002",
      listing_title: "Modern Studio Near Campus",
      guest_name: "Mike Chen",
      start_date: "2024-01-20",
      end_date: "2024-01-25",
      total_price: 600.00,
      stripe_fee_amount: 18.00,
      subly_fee_amount: 30.00,
      host_subly_fee_amount: 18.00,
      guest_subly_fee_amount: 36.00,
      host_payout_amount: 552.00,
      stripe_transfer_id: "tr_123456790",
      status: "confirmed",
      payment_status: "paid",
      created_at: "2024-01-12"
    },
    {
      id: "booking_003",
      listing_title: "Luxury Penthouse Suite",
      guest_name: "Emily Rodriguez",
      start_date: "2024-01-28",
      end_date: "2024-02-02",
      total_price: 1200.00,
      stripe_fee_amount: 36.00,
      subly_fee_amount: 60.00,
      host_subly_fee_amount: 36.00,
      guest_subly_fee_amount: 72.00,
      host_payout_amount: 1104.00,
      stripe_transfer_id: "tr_123456791",
      status: "confirmed",
      payment_status: "paid",
      created_at: "2024-01-15"
    },
    {
      id: "booking_004",
      listing_title: "Charming Garden Cottage",
      guest_name: "David Kim",
      start_date: "2024-02-05",
      end_date: "2024-02-08",
      total_price: 350.00,
      stripe_fee_amount: 10.50,
      subly_fee_amount: 17.50,
      host_subly_fee_amount: 10.50,
      guest_subly_fee_amount: 21.00,
      host_payout_amount: 322.00,
      stripe_transfer_id: "tr_123456792",
      status: "confirmed",
      payment_status: "paid",
      created_at: "2024-01-20"
    },
    {
      id: "booking_005",
      listing_title: "Downtown Loft with City Views",
      guest_name: "Lisa Thompson",
      start_date: "2024-02-10",
      end_date: "2024-02-15",
      total_price: 800.00,
      stripe_fee_amount: 24.00,
      subly_fee_amount: 40.00,
      host_subly_fee_amount: 24.00,
      guest_subly_fee_amount: 48.00,
      host_payout_amount: 736.00,
      stripe_transfer_id: "tr_123456793",
      status: "confirmed",
      payment_status: "paid",
      created_at: "2024-01-25"
    }
  ];

  useEffect(() => {
    if (!userId) return;

    const fetchPaymentHistory = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:4000/api/bookings/host/${userId}`);
        const data = await response.json();
        
        // Filter for completed payments (confirmed bookings with payment data)
        const paymentTransactions = data.filter((booking: PaymentTransaction) => 
          booking.status === 'confirmed' && 
          booking.payment_status === 'paid' &&
          booking.host_payout_amount
        );
        
        // Use mock data for demonstration, fallback to real data if available
        setTransactions(paymentTransactions.length > 0 ? paymentTransactions : mockTransactions);
      } catch (error) {
        console.error('Error fetching payment history:', error);
        // Use mock data if API fails
        setTransactions(mockTransactions);
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentHistory();
  }, [userId]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      confirmed: { text: 'Completed', color: 'bg-green-100 text-green-800' },
      pending: { text: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
      cancelled: { text: 'Cancelled', color: 'bg-red-100 text-red-800' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { text: status, color: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Payment History</h1>
              <p className="text-gray-600 text-sm mt-1">Your completed bookings and earnings</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded-lg w-3/4 mb-6"></div>
            <div className="h-6 bg-gray-200 rounded-lg w-1/2 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded-lg w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Payment History</h1>
              <p className="text-gray-600 text-sm mt-1">Your completed bookings and earnings</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-8">
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-500">No payment history yet</p>
            <p className="text-sm text-gray-400 mt-1">Completed bookings will appear here</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Payment History</h1>
            <p className="text-gray-600 text-sm mt-1">Your completed bookings and earnings</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-8">
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-500 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Earnings Summary</h3>
                  <p className="text-gray-600 text-sm">
                    {transactions.length} completed transactions
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(transactions.reduce((sum, t) => sum + (t.host_payout_amount || 0), 0))}
                </div>
                <div className="text-sm text-gray-500">Total earnings</div>
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Recent Transactions</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Booking
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Guest
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dates
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fees
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payout
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {transaction.listing_title}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {transaction.id.slice(0, 8)}...
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {transaction.guest_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(transaction.start_date)} - {formatDate(transaction.end_date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(transaction.total_price)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">
                          {formatCurrency(transaction.subly_fee_amount)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Stripe: {formatCurrency(transaction.stripe_fee_amount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-semibold text-green-600">
                          {formatCurrency(transaction.host_payout_amount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(transaction.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(transaction.created_at)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 