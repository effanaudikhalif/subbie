"use client";
import { useAuth } from "../../hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import Navbar from "../../components/Navbar";

export default function ProfilePage() {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="bg-gray-50 pt-20 pb-16">
      <Navbar />
      <div className="w-full flex justify-center items-start pt-12">
        <div className="p-8 flex flex-col items-center w-full max-w-3xl">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-3xl font-bold text-blue-700 mb-4">
            {profile?.name ? profile.name[0] : (profile?.email ? profile.email[0] : 'U')}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{profile?.name || "Your Profile"}</h1>
          <div className="text-gray-500 mb-6">{profile?.email}</div>
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Personal Information */}
            <div>
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
                  <span className="block text-base text-gray-900 font-medium">{profile?.phone || "Not provided"}</span>
                </div>
              </div>
            </div>
            {/* University Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">University Information</h3>
              <div className="space-y-3">
                <div>
                  <span className="block text-xs text-gray-500">University</span>
                  <span className="block text-base text-gray-900 font-medium">{profile?.university_name || "Not selected"}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500">Account Created</span>
                  <span className="block text-base text-gray-900 font-medium">
                    {profile?.created_at 
                      ? new Date(profile.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : "Unknown"
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent rounded-xl shadow-sm text-base font-semibold text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
} 


