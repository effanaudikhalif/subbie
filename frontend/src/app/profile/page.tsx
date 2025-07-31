"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useAuth } from "../../hooks/useAuth";
import Navbar from "../../components/Navbar";
import MobileNavbar from "../../components/MobileNavbar";
import ListingCard from "../../components/ListingCard";
import { useRouter, useSearchParams } from "next/navigation";
import { buildApiUrl, buildAvatarUrl } from "../../utils/api";
import Link from "next/link";
import MobileFooter from "../../components/MobileFooter";
import LoadingPage from "../../components/LoadingPage";

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
  const { user, signOut, profile: authProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [hostReviews, setHostReviews] = useState<HostReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [viewingOwnProfile, setViewingOwnProfile] = useState(true);
  const [editForm, setEditForm] = useState({
    name: '',
    about_me: '',
    major: '',
    graduation_year: '',
    education_level: ''
  });
  const [editFormErrors, setEditFormErrors] = useState({
    name: '',
    major: '',
    education_level: '',
    graduation_year: ''
  });
  const [editProfilePicture, setEditProfilePicture] = useState<File | null>(null);
  const [editProfilePicturePreview, setEditProfilePicturePreview] = useState<string>("");
  const [userListings, setUserListings] = useState<any[]>([]);
  const [averageRatings, setAverageRatings] = useState<Record<string, { average_rating: number; total_reviews: number }>>({});

  // MobileNavbar state
  const [where, setWhere] = useState("");
  const [dateRange, setDateRange] = useState([
    {
      startDate: new Date(),
      endDate: new Date(),
      key: "selection",
    },
  ]);

  const handleSearch = () => {
    // Implement navigation or search logic if needed
  };

  // Authentication check - redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Get the userId from URL params, default to current user's ID
    const userIdFromParams = searchParams.get('userId');
    const targetUserId = userIdFromParams || user?.id;
    const isOwnProfile = !userIdFromParams || userIdFromParams === user?.id;
    
    setViewingOwnProfile(isOwnProfile);
    
    if (!targetUserId) return;
    
    // Use auth profile data if viewing own profile
    if (isOwnProfile && authProfile) {
      setProfile({
        ...authProfile,
        graduation_year: authProfile.graduation_year?.toString()
      });
      setEditForm({
        name: authProfile.name || '',
        about_me: authProfile.about_me || '',
        major: authProfile.major || '',
        graduation_year: authProfile.graduation_year?.toString() || '',
        education_level: authProfile.education_level || ''
      });
      setLoading(false);
    } else {
      // Fetch profile for other users
      async function fetchOtherProfile() {
        try {
          setLoading(true);
          const response = await fetch(buildApiUrl(`/api/users/${targetUserId}`));
          if (response.ok) {
            const userData = await response.json();
            console.log('Profile data received:', userData); // Debug log
            setProfile(userData);
            // Initialize edit form with current profile data (only if viewing own profile)
            if (isOwnProfile) {
              setEditForm({
                name: userData.name || '',
                about_me: userData.about_me || '',
                major: userData.major || '',
                graduation_year: userData.graduation_year?.toString() || '',
                education_level: userData.education_level || ''
              });
            }
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
        } finally {
          setLoading(false);
        }
      }
      fetchOtherProfile();
    }

    async function fetchHostReviews() {
      try {
        const response = await fetch(buildApiUrl(`/api/host-reviews?host_id=${targetUserId}`));
        if (response.ok) {
          const reviewsData = await response.json();
          setHostReviews(reviewsData);
        }
      } catch (error) {
        console.error('Error fetching host reviews:', error);
      }
    }

    async function fetchUserListings() {
      try {
        const response = await fetch(buildApiUrl(`/api/listings?user_id=${targetUserId}`));
        if (response.ok) {
          const listingsData = await response.json();
          setUserListings(listingsData);
        }
      } catch (error) {
        console.error('Error fetching user listings:', error);
      }
    }

    async function fetchAverageRatings() {
      try {
        const response = await fetch(buildApiUrl('/api/listings/average-ratings'));
        if (response.ok) {
          const ratingsData = await response.json();
          setAverageRatings(ratingsData);
        }
      } catch (error) {
        console.error('Error fetching average ratings:', error);
      }
    }

    fetchHostReviews();
    fetchUserListings();
    fetchAverageRatings();
  }, [user?.id, searchParams]);

  const handleEditClick = () => {
    if (viewingOwnProfile) {
      setIsEditModalOpen(true);
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    
    // Clear previous errors
    setEditFormErrors({
      name: '',
      major: '',
      education_level: '',
      graduation_year: ''
    });
    
    // Validate required fields
    let hasErrors = false;
    const newErrors = {
      name: '',
      major: '',
      education_level: '',
      graduation_year: ''
    };
    
    if (!editForm.name.trim()) {
      newErrors.name = 'Please enter your full name';
      hasErrors = true;
    }
    
    if (!editForm.major.trim()) {
      newErrors.major = 'Please enter your major';
      hasErrors = true;
    }
    
    if (!editForm.education_level) {
      newErrors.education_level = 'Please select your education level';
      hasErrors = true;
    }
    
    if (!editForm.graduation_year) {
      newErrors.graduation_year = 'Please select your graduation year';
      hasErrors = true;
    }
    
    if (hasErrors) {
      setEditFormErrors(newErrors);
      return;
    }
    
    try {
      // Update profile data
              const response = await fetch(buildApiUrl(`/api/users/${user.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editForm.name,
          about_me: editForm.about_me,
          major: editForm.major,
          graduation_year: editForm.graduation_year ? parseInt(editForm.graduation_year) : null,
          education_level: editForm.education_level
        }),
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        setProfile(updatedProfile);
        console.log('Profile updated successfully:', updatedProfile);
      } else {
        console.error('Failed to update profile:', response.status, response.statusText);
        const errorData = await response.text();
        console.error('Error details:', errorData);
      }

      // Upload profile picture if selected
      if (editProfilePicture) {
        const formData = new FormData();
        formData.append('avatar', editProfilePicture);
        
        const avatarResponse = await fetch(buildApiUrl(`/api/users/${user.id}/avatar`), {
          method: 'POST',
          body: formData,
        });

        if (avatarResponse.ok) {
          const avatarData = await avatarResponse.json();
          setProfile(prev => prev ? { ...prev, avatar_url: avatarData.avatar_url } : null);
          console.log('Avatar updated successfully:', avatarData);
        } else {
          console.error('Failed to upload avatar:', avatarResponse.status, avatarResponse.statusText);
        }
      }

      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleEditProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditProfilePicture(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setEditProfilePicturePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Show loading state while auth is being checked or while loading profile data
  if (authLoading || loading) {
    return <LoadingPage />;
  }

  // If not authenticated, don't render anything (will redirect to login)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white pt-32">
      {isMobile ? (
        <MobileNavbar 
          where={where}
          setWhere={setWhere}
          dateRange={dateRange}
          setDateRange={setDateRange}
          onSearch={handleSearch}
          isProfilePage={true}
        />
      ) : (
        <Navbar />
      )}
              <div className="flex items-start justify-center min-h-screen pt-8">
          <div className={`flex items-start gap-6 lg:gap-12 pb-20 ${isMobile ? 'flex-col pb-40' : 'flex-row'}`}>
            <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-sm w-80 sm:w-96">
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
                  {profile?.email || user?.email || 'No email provided'}
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
            
            {/* Log out button - only show when viewing own profile */}
            {viewingOwnProfile && (
              <div className="mt-6">
                <button
                  onClick={async () => {
                    await signOut();
                    router.push('/login');
                  }}
                  className="bg-white border-2 border-gray-200 text-black px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors w-full"
                >
                  Log Out
                </button>
              </div>
            )}
          </div>
          
          {/* Personal Information - Outside container */}
          <div className="w-80 sm:w-96 bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-sm">
            <div className="space-y-4 sm:space-y-6 pt-2">
                              {/* Edit Button - only show when viewing own profile */}
                {viewingOwnProfile && (
                  <div className="pb-2">
                    <button
                      onClick={handleEditClick}
                      className="bg-white border-2 border-gray-200 text-black px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors w-full"
                    >
                      Edit Profile
                    </button>
                  </div>
                )}             
              
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
              
              {/* Education Info - Matching About Me Style */}
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <div className="text-sm sm:text-base font-semibold text-gray-800 mb-2 flex items-center">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838l-2.727 1.17 1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                  </svg>
                  EDUCATION
                </div>
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center justify-between py-1 sm:py-2 border-b border-gray-200">
                    <span className="text-xs sm:text-sm font-medium text-gray-600">University</span>
                    <span className="text-xs sm:text-sm text-black">{profile?.university_name || 'Not specified'}</span>
                  </div>
                  
                  <div className="flex items-center justify-between py-1 sm:py-2 border-b border-gray-200">
                    <span className="text-xs sm:text-sm font-medium text-gray-600">Education Level</span>
                    <span className="text-xs sm:text-sm text-black">
                      {profile?.education_level 
                        ? profile.education_level.charAt(0).toUpperCase() + profile.education_level.slice(1).toLowerCase()
                        : 'Not specified'
                      }
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-1 sm:py-2 border-b border-gray-200">
                    <span className="text-xs sm:text-sm font-medium text-gray-600">Major</span>
                    <span className="text-xs sm:text-sm text-black">{profile?.major || 'Not specified'}</span>
                  </div>
                  
                  <div className="flex items-center justify-between py-1 sm:py-2">
                    <span className="text-xs sm:text-sm font-medium text-gray-600">Graduation Year</span>
                    <span className="text-xs sm:text-sm text-black">{profile?.graduation_year || 'Not specified'}</span>
                  </div>
                </div>
              </div>
              
              {/* User Listings Gallery */}
              {userListings.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <div className="text-sm sm:text-base font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    LISTINGS
                  </div>
                  <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide">
                    {userListings.map((listing) => {
                      const listingWithRatings = {
                        ...listing,
                        averageRating: averageRatings[listing.id]?.average_rating,
                        totalReviews: averageRatings[listing.id]?.total_reviews
                      };
                      return (
                        <div key={listing.id} className="flex-shrink-0">
                          <ListingCard
                            id={listing.id}
                            title={listing.title}
                            images={listing.images || []}
                            name={listing.name}
                            avatar_url={listing.avatar_url}
                            university_name={listing.university_name}
                            bedrooms={listing.bedrooms}
                            bathrooms={listing.bathrooms}
                            price_per_night={listing.price_per_night}
                            averageRating={listingWithRatings.averageRating}
                            totalReviews={listingWithRatings.totalReviews}
                            amenities={listing.amenities || []}
                            cardHeight="h-[300px]"
                            cardMargin=""
                            isOwnListing={user?.id === listing.user_id}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Footer */}
      {isMobile && <MobileFooter />}

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50" onClick={() => setIsEditModalOpen(false)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Edit Profile</h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="border-b border-gray-300 mb-4 -mx-6"></div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profile Picture
                </label>
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-2 border-gray-300" style={{ borderRadius: '50%' }}>
                    {editProfilePicturePreview ? (
                      <img
                        src={editProfilePicturePreview}
                        alt="Profile preview"
                        className="w-full h-full object-cover"
                        style={{ borderRadius: '50%' }}
                      />
                    ) : profile?.avatar_url ? (
                      <img
                        src={buildAvatarUrl(profile.avatar_url) || ''}
                        alt="Current profile"
                        className="w-full h-full object-cover"
                        style={{ borderRadius: '50%' }}
                      />
                    ) : (
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleEditProfilePictureChange}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                      style={{ color: 'transparent' }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-black focus:border-black placeholder-gray-500 text-gray-900 ${
                    editFormErrors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your full name"
                />
                {editFormErrors.name && (
                  <div className="text-red-600 text-sm mt-1">
                    {editFormErrors.name}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  About Me
                </label>
                <textarea
                  rows={3}
                  value={editForm.about_me}
                  onChange={(e) => setEditForm({...editForm, about_me: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black placeholder-gray-500 text-gray-900"
                  placeholder="Tell us about yourself"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Major <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.major}
                  onChange={(e) => setEditForm({...editForm, major: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-black focus:border-black placeholder-gray-500 text-gray-900 ${
                    editFormErrors.major ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your major"
                />
                {editFormErrors.major && (
                  <div className="text-red-600 text-sm mt-1">
                    {editFormErrors.major}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Education Level <span className="text-red-500">*</span>
                </label>
                <select
                  value={editForm.education_level}
                  onChange={(e) => setEditForm({...editForm, education_level: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-black focus:border-black text-gray-900 ${
                    editFormErrors.education_level ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select your education level</option>
                  <option value="Undergraduate">Undergraduate</option>
                  <option value="Graduate">Graduate</option>
                  <option value="PhD">PhD</option>
                  <option value="Other">Other</option>
                </select>
                {editFormErrors.education_level && (
                  <div className="text-red-600 text-sm mt-1">
                    {editFormErrors.education_level}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Graduation Year <span className="text-red-500">*</span>
                </label>
                <select
                  value={editForm.graduation_year}
                  onChange={(e) => setEditForm({...editForm, graduation_year: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-black focus:border-black text-gray-900 ${
                    editFormErrors.graduation_year ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select your graduation year</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                  <option value="2028">2028</option>
                  <option value="2029">2029</option>
                </select>
                {editFormErrors.graduation_year && (
                  <div className="text-red-600 text-sm mt-1">
                    {editFormErrors.graduation_year}
                  </div>
                )}
              </div>
            </div>


            
            <div className="mt-6">
              <button
                onClick={handleSaveProfile}
                className="bg-white border-2 border-gray-200 text-black px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors w-full"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
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