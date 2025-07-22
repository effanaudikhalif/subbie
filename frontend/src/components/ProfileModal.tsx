"use client";
import { useAuth } from "../hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ListingCard from "./ListingCard";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string | null;
}

function UniversityName({ universityId }: { universityId: string }) {
  const [name, setName] = useState<string>("");
  useEffect(() => {
    if (!universityId) return;
    fetch(`http://localhost:4000/api/universities/${universityId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => setName(data?.name || ""));
  }, [universityId]);
  if (!name) return null;
  return <span className="text-gray-900">{name}</span>;
}

export default function ProfileModal({ isOpen, onClose, userId }: ProfileModalProps) {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    major: "",
    graduation_year: "",
    education_level: "",
    about_me: ""
  });
  const [saving, setSaving] = useState(false);
  const [externalProfile, setExternalProfile] = useState<any>(null);
  const [externalLoading, setExternalLoading] = useState(false);
  const [userListings, setUserListings] = useState<any[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);

  // Fetch another user's profile if userId is provided and not current user
  useEffect(() => {
    if (userId && userId !== user?.id) {
      setExternalLoading(true);
      fetch(`http://localhost:4000/api/users/${userId}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => setExternalProfile(data))
        .finally(() => setExternalLoading(false));
    } else {
      setExternalProfile(null);
    }
  }, [userId, user?.id]);

  useEffect(() => {
    if (profile && !userId) {
      setEditForm({
        major: profile.major || "",
        graduation_year: profile.graduation_year ? profile.graduation_year.toString() : "",
        education_level: profile.education_level || "",
        about_me: profile.about_me || ""
      });
    }
  }, [profile, userId]);

  useEffect(() => {
    if (userId) {
      setListingsLoading(true);
      fetch(`http://localhost:4000/api/listings?user_id=${userId}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setUserListings(Array.isArray(data) ? data.filter(l => !l.status || l.status === 'active' || l.status === 'approved') : []))
        .finally(() => setListingsLoading(false));
    }
  }, [userId]);

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
        major: profile?.major || "",
        graduation_year: profile?.graduation_year ? profile.graduation_year.toString() : "",
        education_level: profile?.education_level || "",
        about_me: profile?.about_me || ""
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
          major: editForm.major,
          graduation_year: editForm.graduation_year ? parseInt(editForm.graduation_year) : null,
          education_level: editForm.education_level,
          about_me: editForm.about_me,
          stripe_account: profile?.stripe_account
        }),
      });
      if (response.ok) {
        const updatedProfile = await response.json();
        // Update local profile state and exit editing mode
        if (profile) {
          profile.major = updatedProfile.major;
          profile.graduation_year = updatedProfile.graduation_year;
          profile.education_level = updatedProfile.education_level;
          profile.about_me = updatedProfile.about_me;
        }
        setIsEditing(false);
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
      major: profile?.major || "",
      graduation_year: profile?.graduation_year ? profile.graduation_year.toString() : "",
      education_level: profile?.education_level || "",
      about_me: profile?.about_me || ""
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

  const isOwnProfile = !userId || userId === user?.id;
  const profileData = isOwnProfile ? profile : externalProfile;

  if ((isOwnProfile && loading) || (!isOwnProfile && externalLoading)) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 backdrop-blur-md" onClick={onClose}></div>
        <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto flex flex-col items-center justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }
  if (!profileData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 backdrop-blur-md" onClick={onClose}></div>
        <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto flex flex-col items-center justify-center p-8">
          <p className="text-gray-400">Profile not found.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 rounded bg-gray-200 text-gray-700">Close</button>
        </div>
      </div>
    );
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto p-0">
        {/* Top bar with Profile and close button */}
        <div className="flex items-center justify-between px-8 pt-6 pb-4 border-b border-gray-200">
          <div className="text-2xl font-bold text-gray-900">Profile</div>
          <div className="flex items-center gap-2">
            {isOwnProfile && (
              <>
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
              </>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex flex-col items-center pt-8 pb-8 px-8">
          {/* Avatar */}
          <div className="relative mb-4">
            {profileData.avatar_url ? (
              <img src={profileData.avatar_url} alt={profileData.name} className="w-24 h-24 rounded-full object-cover bg-blue-100" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-4xl font-bold text-blue-700">
                {profileData.name ? profileData.name[0] : "U"}
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold text-black mb-1">{profileData.name}</h1>
          <div className="text-gray-500 mb-6">{profileData.email}</div>
          <div className="w-full flex flex-col md:flex-row gap-8 mt-4">
            {/* Personal Information */}
            <div className="flex-1">
              <div className="text-lg font-semibold text-gray-800 mb-4">Personal Information</div>
              <div className="mb-3">
                <div className="text-xs text-gray-500 font-semibold uppercase mb-1">Full Name</div>
                <div className="text-base text-gray-900">{profileData.name || "Not provided"}</div>
              </div>
              <div className="mb-3">
                <div className="text-xs text-gray-500 font-semibold uppercase mb-1">Email Address</div>
                <div className="text-base text-gray-900">{profileData.email || "Not provided"}</div>
              </div>
              <div className="mb-3">
                <div className="text-xs text-gray-500 font-semibold uppercase mb-1">About Me</div>
                {isOwnProfile && isEditing ? (
                  <textarea
                    value={editForm.about_me}
                    onChange={e => setEditForm(f => ({ ...f, about_me: e.target.value }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm h-20 resize-none"
                    placeholder="Tell us about yourself..."
                  />
                ) : (
                  <div className="text-base text-gray-900">{profileData.about_me || "Not provided"}</div>
                )}
              </div>
            </div>
            {/* University Information */}
            <div className="flex-1">
              <div className="text-lg font-semibold text-gray-800 mb-4">University Information</div>
              <div className="mb-3">
                <div className="text-xs text-gray-500 font-semibold uppercase mb-1">University</div>
                <div className="text-base text-gray-900"><UniversityName universityId={profileData.university_id} />{!profileData.university_id && "Not provided"}</div>
              </div>
              <div className="mb-3">
                <div className="text-xs text-gray-500 font-semibold uppercase mb-1">Education Level</div>
                {isOwnProfile && isEditing ? (
                  <select
                    value={editForm.education_level}
                    onChange={e => setEditForm(f => ({ ...f, education_level: e.target.value }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm h-10"
                  >
                    <option value="">Select your education level</option>
                    <option value="Undergraduate">Undergraduate</option>
                    <option value="Graduate">Graduate</option>
                    <option value="PhD">PhD</option>
                    <option value="Other">Other</option>
                  </select>
                ) : (
                  <div className="text-base text-gray-900">{profileData.education_level || "Not provided"}</div>
                )}
              </div>
              <div className="mb-3">
                <div className="text-xs text-gray-500 font-semibold uppercase mb-1">Major</div>
                {isOwnProfile && isEditing ? (
                  <input
                    type="text"
                    value={editForm.major}
                    onChange={e => setEditForm(f => ({ ...f, major: e.target.value }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm h-10"
                    placeholder="Enter your major"
                  />
                ) : (
                  <div className="text-base text-gray-900">{profileData.major || "Not provided"}</div>
                )}
              </div>
              <div className="mb-3">
                <div className="text-xs text-gray-500 font-semibold uppercase mb-1">Graduation Year</div>
                {isOwnProfile && isEditing ? (
                  <input
                    type="number"
                    value={editForm.graduation_year}
                    onChange={e => setEditForm(f => ({ ...f, graduation_year: e.target.value }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm h-10"
                    placeholder="Enter your graduation year"
                  />
                ) : (
                  <div className="text-base text-gray-900">{profileData.graduation_year || "Not provided"}</div>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Save/Cancel Buttons */}
        {isOwnProfile && isEditing && (
          <div className="w-full flex gap-4 justify-end px-8 mb-4">
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-xl shadow-sm text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={saving}
              className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-xl shadow-sm text-base font-semibold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        )}
        {/* Listings Section (only for other users) */}
        {!isOwnProfile && (
          <div className="px-8 pb-8">
            <div className="text-lg font-semibold text-gray-800 mb-4">Listings</div>
            {listingsLoading ? (
              <div className="text-gray-500">Loading listings...</div>
            ) : userListings.length === 0 ? (
              <div className="text-gray-500">No active listings.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {userListings.map(listing => (
                  <ListingCard key={listing.id} {...listing} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 