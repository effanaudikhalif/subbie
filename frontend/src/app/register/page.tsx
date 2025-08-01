"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../utils/supabaseClient";
import { useRouter } from "next/navigation";
import { buildApiUrl } from "../../utils/api";

interface University {
  id: string;
  name: string;
  domain: string;
}

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [universityId, setUniversityId] = useState("");
  const [major, setMajor] = useState("");
  const [year, setYear] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [domainWarning, setDomainWarning] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailChecking, setEmailChecking] = useState(false);
  const router = useRouter();

  // Fetch universities on component mount
  useEffect(() => {
    const fetchUniversities = async () => {
      try {
        const response = await fetch(buildApiUrl('/api/universities'));
        if (response.ok) {
          const data = await response.json();
          setUniversities(data);
        } else {
          console.error('Failed to fetch universities:', response.status);
          // Set some default universities
          setUniversities([
            { id: '1', name: 'Boston University', domain: 'bu.edu' },
            { id: '2', name: 'Harvard University', domain: 'harvard.edu' },
            { id: '3', name: 'MIT', domain: 'mit.edu' }
          ]);
        }
      } catch (err) {
        console.error('Error fetching universities:', err);
        // Set some default universities
        setUniversities([
          { id: '1', name: 'Boston University', domain: 'bu.edu' },
          { id: '2', name: 'Harvard University', domain: 'harvard.edu' },
          { id: '3', name: 'MIT', domain: 'mit.edu' }
        ]);
      }
    };
    fetchUniversities();
  }, []);

  // Validate email domain when email or university changes
  useEffect(() => {
    validateEmailDomain();
  }, [email, universityId, universities]);

  // Debounced email existence check
  useEffect(() => {
    const checkEmailTimer = setTimeout(async () => {
      if (email && email.includes('@') && email.length > 5) {
        setEmailChecking(true);
        setEmailError("");
        
        try {
          const emailExists = await checkEmailExists(email);
          if (emailExists) {
            setEmailError("An account with this email address already exists.");
          }
        } catch (err) {
          console.error('Error checking email:', err);
        } finally {
          setEmailChecking(false);
        }
      } else {
        setEmailError("");
        setEmailChecking(false);
      }
    }, 800); // Wait 800ms after user stops typing

    return () => clearTimeout(checkEmailTimer);
  }, [email]);

  // Check if email already exists
  const checkEmailExists = async (emailToCheck: string) => {
    if (!emailToCheck || !emailToCheck.includes('@')) {
      return false;
    }
    
    try {
      const response = await fetch(buildApiUrl(`/api/users/check-email/${encodeURIComponent(emailToCheck)}`));
      if (response.ok) {
        const data = await response.json();
        return data.exists;
      }
    } catch (err) {
      console.error('Error checking email:', err);
    }
    return false;
  };

  // Validate email domain against selected university
  const validateEmailDomain = () => {
    if (!email || !universityId) {
      setDomainWarning("");
      return;
    }

    const emailDomain = email.split('@')[1]?.toLowerCase();
    const selectedUniversity = universities.find(u => u.id === universityId);
    
    if (selectedUniversity && emailDomain && emailDomain !== selectedUniversity.domain.toLowerCase()) {
      setDomainWarning(`Warning: Your email domain (${emailDomain}) doesn't match the selected university's domain (${selectedUniversity.domain}). Please use your university email address.`);
    } else {
      setDomainWarning("");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Validate required fields
    if (!name.trim()) {
      setError("Please enter your full name");
      return;
    }
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }
    if (!email.includes('@')) {
      setError("Please enter a valid email address");
      return;
    }
    if (emailError) {
      setError("Please fix the email error before proceeding");
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
    if (!major.trim()) {
      setError("Please enter your major");
      return;
    }
    if (!year) {
      setError("Please select your graduation year");
      return;
    }
    if (!educationLevel) {
      setError("Please select your education level");
      return;
    }

    // Validate email domain matches selected university
    const emailDomain = email.split('@')[1]?.toLowerCase();
    const selectedUniversity = universities.find(u => u.id === universityId);
    
    if (selectedUniversity && emailDomain && emailDomain !== selectedUniversity.domain.toLowerCase()) {
      setError(`Please use your university email address. Your email domain (${emailDomain}) doesn't match ${selectedUniversity.name}'s domain (${selectedUniversity.domain}).`);
      return;
    }

    setLoading(true);

    try {
      // Check if email already exists
      const emailExists = await checkEmailExists(email);
      if (emailExists) {
        setError("An account with this email address already exists. Please use a different email or try signing in.");
        setLoading(false);
        return;
      }

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
          graduation_year: parseInt(year),
          education_level: educationLevel || null,
          about_me: null,
          stripe_account: null
        };

        const response = await fetch(buildApiUrl('/api/users'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userProfile),
        });

        if (!response.ok) {
          const errorData = await response.json();
          // Check if the error is specifically about duplicate email
          if (response.status === 409) {
            setError("An account with this email address already exists. Please use a different email or try signing in.");
          } else {
            setError(`Failed to create profile: ${errorData.error}`);
          }
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

  return (
    <div className="relative min-h-screen bg-white flex flex-col justify-center items-center pt-12 pb-12">
      <div className="relative z-10 w-full max-w-md px-4">
        <h2 className="text-center text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
        <form onSubmit={handleRegister} className="space-y-6 mt-8">
          {/* Full Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm"
              placeholder="Enter your full name"
            />
          </div>

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${emailError ? 'border-red-300' : 'border-gray-300'} placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm pr-10`}
                placeholder="Enter your email address"
              />
              {emailChecking && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                </div>
              )}
            </div>
            {emailError && (
              <div className="mt-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-md p-3">
                {emailError}
              </div>
            )}
            {domainWarning && !emailError && (
              <div className="mt-2 text-amber-600 text-sm bg-amber-50 border border-amber-200 rounded-md p-3">
                {domainWarning}
              </div>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm"
              placeholder="Enter your password"
            />
          </div>

          {/* University Selection */}
          <div>
            <label htmlFor="university" className="block text-sm font-medium text-gray-700">
              University <span className="text-red-500">*</span>
            </label>
            <select
              id="university"
              required
              value={universityId}
              onChange={e => setUniversityId(e.target.value)}
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm"
            >
              <option value="">Select your university</option>
              {universities.map(university => (
                <option key={university.id} value={university.id}>
                  {university.name}
                </option>
              ))}
            </select>
          </div>

          {/* Major Field */}
          <div>
            <label htmlFor="major" className="block text-sm font-medium text-gray-700">
              Major <span className="text-red-500">*</span>
            </label>
            <input
              id="major"
              type="text"
              required
              value={major}
              onChange={e => setMajor(e.target.value)}
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm"
              placeholder="Enter your major"
            />
          </div>

          {/* Education Level */}
          <div>
            <label htmlFor="educationLevel" className="block text-sm font-medium text-gray-700">
              Education Level <span className="text-red-500">*</span>
            </label>
            <select
              id="educationLevel"
              required
              value={educationLevel}
              onChange={e => setEducationLevel(e.target.value)}
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm"
            >
              <option value="">Select your education level</option>
              <option value="undergraduate">Undergraduate</option>
              <option value="graduate">Graduate</option>
              <option value="phd">PhD</option>
            </select>
          </div>

          {/* Graduation Year */}
          <div>
            <label htmlFor="year" className="block text-sm font-medium text-gray-700">
              Graduation Year <span className="text-red-500">*</span>
            </label>
            <select
              id="year"
              required
              value={year}
              onChange={e => setYear(e.target.value)}
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm"
            >
              <option value="">Select your graduation year</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
              <option value="2028">2028</option>
              <option value="2029">2029</option>
              <option value="2030">2030</option>
            </select>
          </div>

          {/* Error Display */}
          {error && (
            <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md p-3">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </div>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <a href="/login" className="font-medium text-teal-600 hover:text-teal-500">
                Sign in
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
} 