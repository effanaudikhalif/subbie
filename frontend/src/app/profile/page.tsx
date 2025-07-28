"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import Navbar from "../../components/Navbar";

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

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [hostReviews, setHostReviews] = useState<HostReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    about_me: '',
    major: '',
    graduation_year: '',
    education_level: ''
  });
  const [editProfilePicture, setEditProfilePicture] = useState<File | null>(null);
  const [editProfilePicturePreview, setEditProfilePicturePreview] = useState<string>("");

  useEffect(() => {
    async function fetchProfile() {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:4000/api/users/${user.id}`);
        if (response.ok) {
          const userData = await response.json();
          console.log('Profile data received:', userData); // Debug log
          setProfile(userData);
          // Initialize edit form with current profile data
          setEditForm({
            name: userData.name || '',
            about_me: userData.about_me || '',
            major: userData.major || '',
            graduation_year: userData.graduation_year?.toString() || '',
            education_level: userData.education_level || ''
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    }

    async function fetchHostReviews() {
      if (!user?.id) return;
      
      try {
        const response = await fetch(`http://localhost:4000/api/host-reviews?host_id=${user.id}`);
        if (response.ok) {
          const reviewsData = await response.json();
          setHostReviews(reviewsData);
        }
      } catch (error) {
        console.error('Error fetching host reviews:', error);
      }
    }

    fetchProfile();
    fetchHostReviews();
  }, [user?.id]);

  const handleEditClick = () => {
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    
    try {
      // Update profile data
      const response = await fetch(`http://localhost:4000/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editForm.name,
          about_me: editForm.about_me,
          major: editForm.major,
          graduation_year: parseInt(editForm.graduation_year),
          education_level: editForm.education_level
        }),
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        setProfile(updatedProfile);
      }

      // Upload profile picture if selected
      if (editProfilePicture) {
        const formData = new FormData();
        formData.append('avatar', editProfilePicture);
        
        const avatarResponse = await fetch(`http://localhost:4000/api/users/${user.id}/avatar`, {
          method: 'POST',
          body: formData,
        });

        if (avatarResponse.ok) {
          const avatarData = await avatarResponse.json();
          setProfile(prev => prev ? { ...prev, avatar_url: avatarData.avatar_url } : null);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-16">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-16">
      <Navbar />
      <div className="flex items-start justify-center min-h-screen pt-30">
        <div className="flex items-start gap-12">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm w-full max-w-md">
            <div className="flex items-center gap-6">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-gray-600">
                    {profile?.name ? profile.name.charAt(0).toUpperCase() : 'U'}
                  </span>
                )}
              </div>
              
              {/* Name and Email */}
              <div className="flex flex-col justify-center gap-0">
                <h1 className="text-2xl font-bold text-black">
                  {profile?.name || 'User'}
                </h1>
                <p className="text-gray-600 -mt-2">
                  {profile?.email || user?.email || 'No email provided'}
                </p>
              </div>
            </div>
            
            {/* Metrics Section */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-black">{hostReviews.length}</div>
                <div className="text-sm text-gray-600">Reviews</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-black">
                  {hostReviews.length > 0 
                    ? (hostReviews.reduce((sum, review) => {
                        const avgRating = (review.cleanliness_rating + review.accuracy_rating + review.communication_rating + review.location_rating + review.value_rating) / 5;
                        return sum + avgRating;
                      }, 0) / hostReviews.length).toFixed(2) + ' ★'
                    : '0.00 ★'
                  }
                </div>
                <div className="text-sm text-gray-600">Rating</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-black">
                  {profile?.created_at 
                    ? new Date(profile.created_at).toLocaleDateString('en-US', {
                        month: '2-digit',
                        day: '2-digit',
                        year: '2-digit'
                      })
                    : 'N/A'
                  }
                </div>
                <div className="text-sm text-gray-600">Member since</div>
              </div>
            </div>
          </div>
          
          {/* Personal Information - Outside container */}
          <div className="w-[600px]">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-black">Personal Information</h1>
              <button 
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                onClick={handleEditClick}
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
            
            <div className="mt-6 space-y-6">
              {/* About Me Section */}
              {profile?.about_me && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-base font-semibold text-gray-800 mb-2 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    ABOUT ME
                  </div>
                  <div className="text-base text-black leading-relaxed">{profile.about_me}</div>
                </div>
              )}
              
              {/* Education Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center p-4 bg-white border border-gray-200 rounded-lg">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838l-2.727 1.17 1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-gray-500 uppercase tracking-wide">UNIVERSITY</div>
                    <div className="text-base font-normal text-black">{profile?.university_name || 'Not specified'}</div>
                  </div>
                </div>
                
                <div className="flex items-center p-4 bg-white border border-gray-200 rounded-lg">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-4">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-gray-500 uppercase tracking-wide">EDUCATION LEVEL</div>
                    <div className="text-base font-normal text-black">
                      {profile?.education_level 
                        ? profile.education_level.charAt(0).toUpperCase() + profile.education_level.slice(1).toLowerCase()
                        : 'Not specified'
                      }
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center p-4 bg-white border border-gray-200 rounded-lg">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                    <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-gray-500 uppercase tracking-wide">MAJOR</div>
                    <div className="text-base font-normal text-black">{profile?.major || 'Not specified'}</div>
                  </div>
                </div>
                
                <div className="flex items-center p-4 bg-white border border-gray-200 rounded-lg">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mr-4">
                    <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-gray-500 uppercase tracking-wide">GRADUATION YEAR</div>
                    <div className="text-base font-normal text-black">{profile?.graduation_year || 'Not specified'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Edit Profile</h2>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
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
                        src={profile.avatar_url}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  About Me
                </label>
                <textarea
                  rows={3}
                  value={editForm.about_me}
                  onChange={(e) => setEditForm({...editForm, about_me: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Enter your major"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Education Level <span className="text-red-500">*</span>
                </label>
                <select
                  value={editForm.education_level}
                  onChange={(e) => setEditForm({...editForm, education_level: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="">Select your education level</option>
                  <option value="Undergraduate">Undergraduate</option>
                  <option value="Graduate">Graduate</option>
                  <option value="PhD">PhD</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Graduation Year <span className="text-red-500">*</span>
                </label>
                <select
                  value={editForm.graduation_year}
                  onChange={(e) => setEditForm({...editForm, graduation_year: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="">Select your graduation year</option>
                  <option value="2025">Class of 2025</option>
                  <option value="2026">Class of 2026</option>
                  <option value="2027">Class of 2027</option>
                  <option value="2028">Class of 2028</option>
                  <option value="2029">Class of 2029</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleSaveProfile}
                className="flex-1 bg-teal-600 text-white py-2 px-4 rounded-md hover:bg-teal-700 transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 