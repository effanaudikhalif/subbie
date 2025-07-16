"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../utils/supabaseClient";
import { useRouter } from "next/navigation";

interface University {
  id: string;
  name: string;
  domain: string;
}

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [universityId, setUniversityId] = useState("");
  const [major, setMajor] = useState("");
  const [year, setYear] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // Fetch universities on component mount
  useEffect(() => {
    const fetchUniversities = async () => {
      try {
        const response = await fetch('http://localhost:4000/api/universities');
        if (response.ok) {
          const data = await response.json();
          setUniversities(data);
        }
      } catch (err) {
        console.error('Error fetching universities:', err);
      }
    };
    fetchUniversities();
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatar(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setError("");
      
      if (currentStep === 1) {
        if (!name.trim()) {
          setError("Please enter your full name");
          return;
        }
        if (!avatar) {
          setError("Please upload a profile picture");
          return;
        }
      } else if (currentStep === 2) {
        if (!email.trim()) {
          setError("Please enter your email address");
          return;
        }
        if (!email.includes('@')) {
          setError("Please enter a valid email address");
          return;
        }
        if (!universityId) {
          setError("Please select your university");
          return;
        }
        if (password.length < 6) {
          setError("Password must be at least 6 characters long");
          return;
        }
      }
      
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError("");
    }
  };

  const validateCurrentStep = () => {
    if (currentStep === 1) {
      return name.trim() && avatar;
    } else if (currentStep === 2) {
      return email.trim() && email.includes('@') && universityId && password.length >= 6;
    } else if (currentStep === 3) {
      return major.trim() && year;
    }
    return false;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Validate step 3 fields
    if (!major.trim()) {
      setError("Please enter your major");
      return;
    }
    if (!year) {
      setError("Please select your graduation year");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({ 
        email, 
        password 
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (authData.user) {
        // Step 2: Create user profile in our database
        const userProfile = {
          id: authData.user.id,
          university_id: universityId,
          name: name,
          email: email,
          major: major,
          year: parseInt(year),
          stripe_account: null
        };

        const response = await fetch('http://localhost:4000/api/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userProfile),
        });

        if (!response.ok) {
          const errorData = await response.json();
          setError(`Failed to create profile: ${errorData.error}`);
          setLoading(false);
          return;
        }

        // Registration successful
        router.push("/login?message=Registration successful! Please check your email to verify your account.");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return "Step 1: Profile Picture & Name";
      case 2: return "Step 2: Account Details";
      case 3: return "Step 3: Education Info";
      default: return "";
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 1: return "Let's start with your profile picture and name";
      case 2: return "Set up your account credentials";
      case 3: return "Tell us about your education (education level is optional)";
      default: return "";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex flex-col justify-center items-center py-8">
      <div className="w-full max-w-md px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Create your account
          </h1>
          <p className="text-gray-600 text-lg">
            Join Subly to find and list places to sublet
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">{getStepTitle()}</span>
            <span className="text-sm text-gray-500">{currentStep}/3</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full transition-all duration-300 ease-in-out"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-500 mt-2 text-center">{getStepDescription()}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleRegister} className="space-y-6">
          {/* Step 1: Profile Picture & Name */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fadeIn">
              {/* Profile Picture */}
              <div className="text-center">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Profile Picture
                </label>
                <div className="relative">
                  <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-pink-100 to-purple-100 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-pink-400 transition-colors">
                    {avatarPreview ? (
                      <img 
                        src={avatarPreview} 
                        alt="Profile preview" 
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="text-center">
                        <div className="text-2xl text-gray-400 mb-1">📷</div>
                        <div className="text-xs text-gray-500">Add Photo</div>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">Click to upload your profile picture</p>
              </div>

              {/* Full Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                  placeholder="Enter your full name"
                />
              </div>
            </div>
          )}

          {/* Step 2: Email, University, Password */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fadeIn">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                  placeholder="Enter your email address"
                />
              </div>

              {/* University */}
              <div>
                <label htmlFor="university" className="block text-sm font-medium text-gray-700 mb-2">
                  University
                </label>
                <select
                  id="university"
                  value={universityId}
                  onChange={e => setUniversityId(e.target.value)}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-200 ${universityId ? 'text-gray-900' : 'text-gray-500'}`}
                >
                  <option value="">Select your university</option>
                  {universities.map((university) => (
                    <option key={university.id} value={university.id}>
                      {university.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                  placeholder="Create a password (min 6 characters)"
                />
              </div>
            </div>
          )}

          {/* Step 3: Education Level, Major, Graduation Year */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fadeIn">
              {/* Education Level */}
              <div>
                <label htmlFor="educationLevel" className="block text-sm font-medium text-gray-700 mb-2">
                  Education Level (Optional)
                </label>
                <select
                  id="educationLevel"
                  value={educationLevel}
                  onChange={e => setEducationLevel(e.target.value)}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-200 ${educationLevel ? 'text-gray-900' : 'text-gray-500'}`}
                >
                  <option value="">Select your education level (optional)</option>
                  <option value="undergraduate">Undergraduate</option>
                  <option value="graduate">Graduate</option>
                  <option value="phd">PhD</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Major */}
              <div>
                <label htmlFor="major" className="block text-sm font-medium text-gray-700 mb-2">
                  Major
                </label>
                <input
                  id="major"
                  type="text"
                  value={major}
                  onChange={e => setMajor(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                  placeholder="Enter your major"
                />
              </div>

              {/* Graduation Year */}
              <div>
                <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-2">
                  Graduation Year
                </label>
                <select
                  id="year"
                  value={year}
                  onChange={e => setYear(e.target.value)}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-200 ${year ? 'text-gray-900' : 'text-gray-500'}`}
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
          )}

          {/* Error Display */}
          {error && (
            <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl p-4 animate-shake">
              {error}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 pt-4">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all duration-200"
              >
                Back
              </button>
            )}
            
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={!validateCurrentStep()}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-medium rounded-xl hover:from-pink-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-medium rounded-xl hover:from-pink-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>
            )}
          </div>

          {/* Login Link */}
          <div className="text-center pt-4">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <a href="/login" className="font-medium text-pink-600 hover:text-pink-500 transition-colors">
                Sign in
              </a>
            </p>
          </div>
        </form>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
} 