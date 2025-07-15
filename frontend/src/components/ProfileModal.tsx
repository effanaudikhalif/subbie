"use client";
import { useAuth } from "../hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    phone: "",
    major: "",
    year: ""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setEditForm({
        phone: profile.phone || "",
        major: profile.major || "",
        year: profile.year ? profile.year.toString() : ""
      });
    }
  }, [profile]);

  const handleLogout = async () => {
    await signOut();
    onClose();
    router.push("/");
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch(`http://localhost:4000/api/users/${user.id}/avatar`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Avatar uploaded successfully:', result);
        // Refresh the profile data
        window.location.reload();
      } else {
        const errorData = await response.json();
        console.error('Failed to upload avatar:', errorData.error);
        alert('Failed to upload avatar: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    if (!isEditing) {
      // Reset form when entering edit mode
      setEditForm({
        phone: profile?.phone || "",
        major: profile?.major || "",
        year: profile?.year ? profile.year.toString() : ""
      });
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const response = await fetch(`http://localhost:4000/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          university_id: profile?.university_id,
          name: profile?.name,
          email: profile?.email,
          phone: editForm.phone,
          major: editForm.major,
          year: editForm.year ? parseInt(editForm.year) : null,
          stripe_account: profile?.stripe_account
        }),
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        // Refresh the page to show updated data
        window.location.reload();
      } else {
        const errorData = await response.json();
        alert('Failed to update profile: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset form to original values
    setEditForm({
      phone: profile?.phone || "",
      major: profile?.major || "",
      year: profile?.year ? profile.year.toString() : ""
    });
  };

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 backdrop-blur-md"
        onClick={onClose}
      ></div>
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Profile</h2>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={handleEditToggle}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
              >
                Edit
              </button>
            )}
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-3 py-1.5 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition"
            >
              Logout
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading profile...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {/* Avatar */}
              <div className="relative mb-4">
                <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-3xl font-bold text-blue-700 overflow-hidden">
                  {profile?.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt="Profile picture" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to initials if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.classList.remove('bg-blue-100');
                          parent.classList.add('bg-blue-100');
                        }
                      }}
                    />
                  ) : (
                    <span className="text-3xl font-bold text-blue-700">
                      {profile?.name ? profile.name[0] : (profile?.email ? profile.email[0] : 'U')}
                    </span>
                  )}
                </div>
                {/* Upload button */}
                <label className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-1 cursor-pointer hover:bg-blue-700 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  {uploading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  )}
                </label>
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{profile?.name || "Your Profile"}</h1>
              <div className="text-gray-500 mb-6">{profile?.email}</div>
              
              <div className="w-full flex flex-col md:flex-row gap-8 mb-8">
                {/* Personal Information */}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Personal Information</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="block text-xs text-gray-500">Full Name</span>
                      <span className="block text-base text-gray-900 font-medium">{profile?.name || "Not provided"}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-500">Email Address</span>
                      <span className="block text-base text-gray-900 font-medium">{profile?.email}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-500">Phone Number</span>
                      {isEditing ? (
                        <input
                          type="tel"
                          value={editForm.phone}
                          onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                          className="block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="Enter phone number"
                        />
                      ) : (
                        <span className="block text-base text-gray-900 font-medium">{profile?.phone || "Not provided"}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* University Information */}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">University Information</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="block text-xs text-gray-500">University</span>
                      <span className="block text-base text-gray-900 font-medium">{profile?.university_name || "Not selected"}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-500">Major</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.major}
                          onChange={(e) => setEditForm({...editForm, major: e.target.value})}
                          className="block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="Enter your major"
                        />
                      ) : (
                        <span className="block text-base text-gray-900 font-medium">{profile?.major || "Not provided"}</span>
                      )}
                    </div>
                    <div>
                      <span className="block text-xs text-gray-500">Year</span>
                      {isEditing ? (
                        <select
                          value={editForm.year}
                          onChange={(e) => setEditForm({...editForm, year: e.target.value})}
                          className="block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                          <option value="">Select your graduation year</option>
                          <option value="2025">Class of 2025</option>
                          <option value="2026">Class of 2026</option>
                          <option value="2027">Class of 2027</option>
                          <option value="2028">Class of 2028</option>
                          <option value="2029">Class of 2029</option>
                        </select>
                      ) : (
                        <span className="block text-base text-gray-900 font-medium">
                          {profile?.year ? `Class of ${profile.year}` : "Not provided"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Save/Cancel Buttons */}
              {isEditing && (
                <div className="w-full flex gap-4 mb-6">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="flex-1 inline-flex justify-center items-center px-4 py-3 border border-transparent rounded-xl shadow-sm text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="flex-1 inline-flex justify-center items-center px-4 py-3 border border-gray-300 rounded-xl shadow-sm text-base font-semibold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 