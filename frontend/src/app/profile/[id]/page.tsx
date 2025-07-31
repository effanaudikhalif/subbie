"use client";
import React, { useEffect, useState, Suspense } from "react";
import type { User } from '../../../types/User';
import { useParams, useRouter } from "next/navigation";
import { buildApiUrl, buildAvatarUrl } from '../../../utils/api';
import Link from "next/link";
import Navbar from "../../../components/Navbar";
import MobileNavbar from "../../../components/MobileNavbar";
import SearchBar from "../../../components/Searchbar";
import { useAuth } from "../../../hooks/useAuth";
import MobileFooter from "../../../components/MobileFooter";
import LoadingPage from "../../../components/LoadingPage";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  university_id?: string;
  university_name?: string;
  major?: string;
  graduation_year?: string;
  education_level?: string;
  about_me?: string;
  phone?: string;
  created_at?: string;
}

interface HostReview {
  id: string;
  cleanliness_rating: number;
  accuracy_rating: number;
  communication_rating: number;
  location_rating: number;
  value_rating: number;
  comment: string;
  created_at: string;
}

function ProfilePageContent() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [hostReviews, setHostReviews] = useState<HostReview[]>([]);
  const [userListings, setUserListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  // SearchBar state
  const [where, setWhere] = useState("");
  const [dateRange, setDateRange] = useState([
    {
      startDate: new Date(),
      endDate: new Date(),
      key: "selection",
    },
  ]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [guests, setGuests] = useState("");

  const handleSearch = () => {
    const checkin = dateRange[0].startDate ? new Date(dateRange[0].startDate).toISOString().slice(0,10) : '';
    const checkout = dateRange[0].endDate ? new Date(dateRange[0].endDate).toISOString().slice(0,10) : '';
    router.push(
      `/listings?where=${encodeURIComponent(where)}&checkin=${checkin}&checkout=${checkout}`
    );
  };

  // Check if viewing own profile
  const viewingOwnProfile = user?.id === id;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
      setIsSmallScreen(window.innerWidth <= 640);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    async function fetchProfile() {
      if (!id) return;
      
      setLoading(true);
      try {
        // Fetch user profile
        const userRes = await fetch(buildApiUrl(`/api/users/${id}`));
        if (!userRes.ok) {
          throw new Error('User not found');
        }
        const userData = await userRes.json();
        setProfile(userData);

        // Fetch university if available
        if (userData.university_id) {
          const uniRes = await fetch(buildApiUrl(`/api/universities/${userData.university_id}`));
          if (uniRes.ok) {
            const uniData = await uniRes.json();
            setProfile(prev => prev ? { ...prev, university_name: uniData.name } : null);
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }

    async function fetchHostReviews() {
      if (!id) return;
      try {
        const res = await fetch(buildApiUrl(`/api/host-reviews/user/${id}`));
        if (res.ok) {
          const reviews = await res.json();
          setHostReviews(Array.isArray(reviews) ? reviews : []);
        }
      } catch (error) {
        console.error('Error fetching host reviews:', error);
      }
    }

    async function fetchUserListings() {
      if (!id) return;
      try {
        const res = await fetch(buildApiUrl(`/api/listings?user_id=${id}`));
        if (res.ok) {
          const listings = await res.json();
          setUserListings(Array.isArray(listings) ? listings : []);
        }
      } catch (error) {
        console.error('Error fetching user listings:', error);
      }
    }

    if (id) {
      fetchProfile();
      fetchHostReviews();
      fetchUserListings();
    }
  }, [id]);

  if (loading) {
    return <LoadingPage />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <MobileNavbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">User Not Found</h1>
            <p className="text-gray-600 mb-4">The user you're looking for doesn't exist.</p>
            <Link href="/" className="text-blue-600 hover:text-blue-800">
              Go back home
            </Link>
          </div>
        </div>
        <MobileFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <MobileNavbar />
      
      {/* Main Content */}
      <div className="pt-8 pb-20">
        <div className="max-w-4xl mx-auto px-4">
          {/* Profile Header */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col items-center">
              {/* Avatar */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full bg-gray-200 flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img
                    src={buildAvatarUrl(profile.avatar_url) || ''}
                    alt="Profile"
                    className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-600">
                    {profile?.name ? profile.name.charAt(0).toUpperCase() : 'U'}
                  </span>
                )}
              </div>
              
              {/* Name and Email */}
              <div className="flex flex-col items-center -mt-4">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-black text-center">
                  {profile?.name || 'User'}
                </h1>
                <p className="text-sm sm:text-base text-gray-600 text-center -mt-4">
                  {profile?.email || 'No email provided'}
                </p>
              </div>
            </div>
            
            {/* Metrics Section */}
            <div className="flex justify-center items-center mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200 gap-12">
              <div className="text-center">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-black">{hostReviews.length}</div>
                <div className="text-xs sm:text-sm text-gray-600">Host Reviews</div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-black">
                  ★ {hostReviews.length > 0 
                    ? (hostReviews.reduce((sum, review) => {
                        const avgRating = (review.cleanliness_rating + review.accuracy_rating + review.communication_rating + review.location_rating + review.value_rating) / 5;
                        return sum + avgRating;
                      }, 0) / hostReviews.length).toFixed(2)
                    : '0.00'
                  }
                </div>
                <div className="text-xs sm:text-sm text-gray-600">Host Rating</div>
              </div>
            </div>
          </div>
          
          {/* Personal Information */}
          <div className="w-full sm:w-96 mx-auto bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-sm">
            <div className="space-y-4 sm:space-y-6 pt-2">
              
              {/* About Me Section */}
              {profile?.about_me && (
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <div className="text-sm sm:text-base font-semibold text-gray-800 mb-2 flex items-center">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    ABOUT ME
                  </div>
                  <div className="text-sm sm:text-base text-black leading-relaxed">{profile.about_me}</div>
                </div>
              )}
              
              {/* Education Info */}
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <div className="text-sm sm:text-base font-semibold text-gray-800 mb-2 flex items-center">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838l-2.727 1.17 1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                  </svg>
                  EDUCATION
                </div>
                <div className="space-y-2 sm:space-y-3">
                  {profile?.university_name && (
                    <div className="flex items-center">
                      <span className="text-sm sm:text-base font-medium text-gray-700 w-20">School:</span>
                      <span className="text-sm sm:text-base text-black">{profile.university_name}</span>
                    </div>
                  )}
                  {profile?.major && (
                    <div className="flex items-center">
                      <span className="text-sm sm:text-base font-medium text-gray-700 w-20">Major:</span>
                      <span className="text-sm sm:text-base text-black">{profile.major}</span>
                    </div>
                  )}
                  {profile?.education_level && (
                    <div className="flex items-center">
                      <span className="text-sm sm:text-base font-medium text-gray-700 w-20">Level:</span>
                      <span className="text-sm sm:text-base text-black">{profile.education_level}</span>
                    </div>
                  )}
                  {profile?.graduation_year && (
                    <div className="flex items-center">
                      <span className="text-sm sm:text-base font-medium text-gray-700 w-20">Graduation:</span>
                      <span className="text-sm sm:text-base text-black">{profile.graduation_year}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* User's Listings */}
          {userListings.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-black mb-4">Listings by {profile.name}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {userListings.map((listing) => (
                  <div key={listing.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <h3 className="font-semibold text-black mb-2">{listing.title}</h3>
                    <p className="text-gray-600 text-sm mb-2">{listing.city}, {listing.state}</p>
                    <p className="text-black font-semibold">${listing.price_per_night}/night</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Host Reviews */}
          {hostReviews.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-black mb-4">Reviews for {profile.name}</h2>
              <div className="space-y-4">
                {hostReviews.map((review) => (
                  <div key={review.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <span className="text-yellow-500 mr-1">★</span>
                        <span className="text-sm text-gray-600">
                          {((review.cleanliness_rating + review.accuracy_rating + review.communication_rating + review.location_rating + review.value_rating) / 5).toFixed(1)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-black">{review.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <MobileFooter />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProfilePageContent />
    </Suspense>
  );
} 