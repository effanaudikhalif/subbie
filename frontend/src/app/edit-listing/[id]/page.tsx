"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import MobileNavbar from '../../../components/MobileNavbar';
import { useAuth } from '../../../hooks/useAuth';
import GoogleMapsAutocomplete from '../../../components/GoogleMapsAutocomplete';
import MapPreview from '../../../components/MapPreview';
import PhotoUpload from '../../../components/PhotoUpload';
import CompactCalendar from '../../../components/CompactCalendar';
import { buildApiUrl, buildImageUrl } from '../../../utils/api';
import LoadingPage from '../../../components/LoadingPage';
import { uploadListingImage } from '../../../utils/supabaseStorage';

interface FormData {
  property_type: 'house' | 'apartment';
  guest_space: 'entire_place' | 'room' | 'shared_room';
  address: string;
  unit: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  neighborhood: string;
  latitude?: number;
  longitude?: number;
  max_occupancy: number;
  bedrooms: number;
  bathrooms: number;
  occupants: string[];
  amenities: string[];
  photos: (File | string)[];
  title: string;
  description: string;
  price_per_night: number;
  start_date: string;
  end_date: string;
}

export default function EditListing() {
  const { id } = useParams();
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [listing, setListing] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  // Mobile navbar state
  const [where, setWhere] = useState('');
  const [dateRange, setDateRange] = useState([{ startDate: null, endDate: null, key: 'selection' }]);
  
  const [aiAboutLoading, setAiAboutLoading] = useState(false);
  const [aiAboutError, setAiAboutError] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  
  const getAboutPromptData = () => {
    const {
      property_type,
      guest_space,
      address,
      unit,
      city,
      state,
      zip,
      country,
      neighborhood,
      latitude,
      longitude,
      max_occupancy,
      bedrooms,
      bathrooms,
      occupants,
      amenities,
      photos,
      title
    } = formData;
    return {
      property_type,
      guest_space,
      address,
      unit,
      city,
      state,
      zip,
      country,
      neighborhood,
      latitude,
      longitude,
      max_occupancy,
      bedrooms,
      bathrooms,
      occupants,
      amenities,
      photo_count: photos.length,
      title
    };
  };
  
  const handleAiSuggestAbout = async () => {
    setAiAboutLoading(true);
    setAiAboutError('');
    try {
      const response = await fetch(buildApiUrl('/api/openai/suggest'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptType: 'about',
          formData: getAboutPromptData(),
        }),
      });
      if (!response.ok) throw new Error('Failed to get AI suggestion');
      const data = await response.json();
      let suggestion = data.suggestion || '';
      if (suggestion.length > 500) suggestion = suggestion.slice(0, 500);
      setFormData((prev: FormData) => ({ ...prev, description: suggestion }));
    } catch (err) {
      setAiAboutError('AI suggestion failed. Try again.');
    } finally {
      setAiAboutLoading(false);
    }
  };

  const [formData, setFormData] = useState<FormData>({
    property_type: 'apartment',
    guest_space: 'entire_place',
    address: '',
    unit: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    neighborhood: '',
    latitude: undefined,
    longitude: undefined,
    max_occupancy: 1,
    bedrooms: 1,
    bathrooms: 1,
    occupants: [],
    amenities: [],
    photos: [],
    title: '',
    description: '',
    price_per_night: 100,
    start_date: '',
    end_date: ''
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isEditing, setIsEditing] = useState(false);

  // Mobile responsiveness state management
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1024);
    };

    // Check on mount
    checkMobile();

    // Add event listener for window resize
    window.addEventListener('resize', checkMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mobile navbar search handler
  const handleMobileSearch = () => {
    if (where.trim()) {
      router.push(`/results?location=${encodeURIComponent(where.trim())}`);
    }
  };


  // Load existing listing data
  useEffect(() => {
    const fetchListing = async () => {
      setLoading(true);
      try {
        const response = await fetch(buildApiUrl(`/api/listings/${id}`));
        if (response.ok) {
          const listingData = await response.json();
          console.log('listingData.images:', listingData.images); // Debug: see what backend returns
          console.log('Fetched listingData:', listingData); // Debug log
          setListing(listingData);
          setFormData({
            property_type: listingData.property_type || 'apartment',
            guest_space: listingData.guest_space || 'entire_place',
            address: listingData.address || '',
            unit: listingData.unit || '',
            city: listingData.city || '',
            state: listingData.state || '',
            zip: listingData.zip || '',
            country: listingData.country || '',
            neighborhood: listingData.neighborhood || '',
            latitude: listingData.latitude,
            longitude: listingData.longitude,
            max_occupancy: listingData.max_occupancy || 1,
            bedrooms: listingData.bedrooms || 1,
            bathrooms: listingData.bathrooms || 1,
            occupants: listingData.occupants || [],
            amenities: listingData.amenities?.map((a: any) => a.code || a) || [],
            photos: listingData.images?.map((img: any) => buildImageUrl(img.url)) || [], // Map images to full URLs
            title: listingData.title || '',
            description: listingData.description || '',
            price_per_night: Number(listingData.price_per_night) || 100, // Always coerce to number
            start_date: listingData.start_date ? new Date(listingData.start_date).toISOString().split('T')[0] : '',
            end_date: listingData.end_date ? new Date(listingData.end_date).toISOString().split('T')[0] : ''
          });
        } else {
          alert('Listing not found');
          router.push('/my-listings');
        }
      } catch (error) {
        console.error('Error fetching listing:', error);
        alert('Failed to load listing');
        router.push('/my-listings');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchListing();
    }
  }, [id, router]);

  const amenities = [
    // Living Essentials
    { code: 'wifi', name: 'Wi-Fi', category: 'living' },
    { code: 'heating', name: 'Heating', category: 'living' },
    { code: 'air_conditioning', name: 'Air conditioning', category: 'living' },
    { code: 'kitchen', name: 'Kitchen', category: 'living' },
    { code: 'cutlery', name: 'Cutlery', category: 'living' },
    { code: 'washer', name: 'Washer', category: 'living' },
    { code: 'dryer', name: 'Dryer', category: 'living' },
    { code: 'cleaning_supplies', name: 'Cleaning supplies', category: 'living' },
    { code: 'safe_locks', name: 'Safe locks', category: 'living' },
    
    // College Essentials
    { code: 'dedicated_workspace', name: 'Dedicated workspace', category: 'college' },
    { code: 'printer', name: 'Printer', category: 'college' },
    { code: 'outlets', name: 'Outlets', category: 'college' },
    { code: 'storage', name: 'Storage', category: 'college' },
    { code: 'whiteboard', name: 'Whiteboard', category: 'college' },
    { code: 'bike_storage', name: 'Bike storage', category: 'college' },
    { code: 'coffee_maker', name: 'Coffee maker', category: 'college' },
    { code: 'monitor', name: 'Monitor', category: 'college' },
    
    // Extra
    { code: 'tv', name: 'TV', category: 'extra' },
    { code: 'outdoor_space', name: 'Outdoor space', category: 'extra' },
    { code: 'parking', name: 'Parking', category: 'extra' },
    { code: 'gym', name: 'Gym', category: 'extra' },
    { code: 'games', name: 'Games', category: 'extra' },
    { code: 'dishwasher', name: 'Dishwasher', category: 'extra' },
    { code: 'speaker', name: 'Speaker', category: 'extra' }
  ];

  const occupants = [
    { value: 'me', label: 'Me' },
    { value: 'family', label: 'My family' },
    { value: 'other_guests', label: 'Other guests' },
    { value: 'roommate', label: 'Roommate' }
  ];

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAmenityToggle = (amenityCode: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenityCode)
        ? prev.amenities.filter(a => a !== amenityCode)
        : [...prev.amenities, amenityCode]
    }));
  };

  const handleOccupantToggle = (occupant: string) => {
    setFormData(prev => ({
      ...prev,
      occupants: prev.occupants.includes(occupant)
        ? prev.occupants.filter(o => o !== occupant)
        : [...prev.occupants, occupant]
    }));
  };

  const handleAddressSelect = (addressData: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    neighborhood?: string;
    latitude?: number;
    longitude?: number;
  }) => {
    setFormData(prev => ({
      ...prev,
      address: addressData.street,
      city: addressData.city,
      state: addressData.state,
      zip: addressData.zip,
      country: addressData.country,
      neighborhood: addressData.neighborhood || prev.neighborhood,
      latitude: addressData.latitude,
      longitude: addressData.longitude
    }));
  };

  const handleCalendarChange = ({ startDate, endDate }: { startDate: Date | null, endDate: Date | null }) => {
    setFormData(prev => ({
      ...prev,
      start_date: startDate ? startDate.toISOString().split('T')[0] : '',
      end_date: endDate ? endDate.toISOString().split('T')[0] : '',
    }));
    
    // Auto-close calendar when both dates are selected
    if (startDate && endDate) {
      setShowCalendar(false);
    }
  };

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showCalendar && !(event.target as Element).closest('.calendar-container')) {
        setShowCalendar(false);
      }
    };

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCalendar]);



  // Helper function to render error messages
  const renderError = (field: string) => {
    if (errors[field]) {
      return (
        <div className="text-red-500 text-sm mt-1 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {errors[field]}
        </div>
      );
    }
    return null;
  };

  // Validation functions for each step
  const validateStep = (step: number): boolean => {
    const newErrors: {[key: string]: string} = {};
    
    switch (step) {
      case 1:
        if (!formData.property_type) {
          newErrors.property_type = 'Please select a property type';
        }
        break;
      case 2:
        if (!formData.guest_space) {
          newErrors.guest_space = 'Please select a guest space type';
        }
        break;
      case 3:
        if (!formData.address.trim()) {
          newErrors.address = 'Address is required';
        }
        if (!formData.city.trim()) {
          newErrors.city = 'City is required';
        }
        if (!formData.state.trim()) {
          newErrors.state = 'State is required';
        }
        if (!formData.zip.trim()) {
          newErrors.zip = 'ZIP code is required';
        }
        if (!formData.country.trim()) {
          newErrors.country = 'Country is required';
        }
        break;
      case 4:
        if (formData.max_occupancy < 1) {
          newErrors.max_occupancy = 'Maximum occupancy must be at least 1';
        }
        break;
      case 5:
        // No validation needed - occupants can be empty (guest might be alone)
        break;
      case 6:
        if (formData.amenities.length === 0) {
          newErrors.amenities = 'Please select at least one amenity';
        }
        break;
      case 7:
        if (formData.photos.length < 5) {
          newErrors.photos = 'Please upload at least 5 photos';
        }
        break;
      case 8:
        if (!formData.title.trim()) {
          newErrors.title = 'Title is required';
        } else if (formData.title.length > 30) {
          newErrors.title = 'Title must be 30 characters or less';
        }
        break;
      case 9:
        if (!formData.description.trim()) {
          newErrors.description = 'Description is required';
        } else if (formData.description.length > 500) {
          newErrors.description = 'Description must be 500 characters or less';
        }
        break;
      case 10:
        if (!formData.price_per_night || formData.price_per_night <= 0) {
          newErrors.price_per_night = 'Price must be greater than 0';
        }
        break;
      case 11:
        if (!formData.start_date) {
          newErrors.start_date = 'Check-in date is required';
        }
        if (!formData.end_date) {
          newErrors.end_date = 'Check-out date is required';
        }
        if (formData.start_date && formData.end_date) {
          const startDate = new Date(formData.start_date + 'T00:00:00');
          const endDate = new Date(formData.end_date + 'T00:00:00');
          const cleanStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
          const cleanEndDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
          if (cleanStartDate >= cleanEndDate) {
            newErrors.end_date = 'Check-out date must be after check-in date';
          }
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 11) {
      setCurrentStep(currentStep + 1);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      console.log('Updating listing with Supabase Storage...');

      // Handle photo uploads - upload new File objects to Supabase Storage
      const imageUrls: string[] = [];
      
      for (let i = 0; i < formData.photos.length; i++) {
        const photo = formData.photos[i];
        
        // If it's already a URL (existing image), keep it
        if (typeof photo === 'string') {
          imageUrls.push(photo);
          continue;
        }
        
        // Upload new file to Supabase Storage
        console.log(`Uploading new image ${i + 1}...`);
        const tempListingId = `listing-${id}-${Date.now()}`;
        const uploadResult = await uploadListingImage(photo, tempListingId, i);
        
        if (!uploadResult.success) {
          throw new Error(`Failed to upload image ${i + 1}: ${uploadResult.error}`);
        }
        
        imageUrls.push(uploadResult.url!);
      }
      
      console.log('Image URLs for update:', imageUrls);

      // Prepare data as JSON
      const submitData = {
        title: formData.title,
        description: formData.description,
        address: formData.address,
        unit: formData.unit,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        country: formData.country,
        neighborhood: formData.neighborhood,
        latitude: formData.latitude,
        longitude: formData.longitude,
        price_per_night: formData.price_per_night,
        start_date: formData.start_date,
        end_date: formData.end_date,
        max_occupancy: formData.max_occupancy,
        property_type: formData.property_type,
        guest_space: formData.guest_space,
        bedrooms: formData.bedrooms,
        bathrooms: formData.bathrooms,
        amenities: formData.amenities,
        occupants: formData.occupants,
        image_urls: imageUrls // Send updated image URLs
      };

      // Debug: Log the amenities being sent
      console.log('Amenities being sent:', formData.amenities);
      console.log('Amenity codes that exist in frontend:', amenities.map(a => a.code));
      console.log('Amenity codes being sent:', formData.amenities);
      
      // Check if any sent amenities don't exist in our frontend list
      const invalidAmenities = formData.amenities.filter(code => 
        !amenities.some(amenity => amenity.code === code)
      );
      if (invalidAmenities.length > 0) {
        console.error('Invalid amenity codes being sent:', invalidAmenities);
      }

            const response = await fetch(buildApiUrl(`/api/listings/${id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData)
      });

      if (response.ok) {
        alert('Listing updated successfully!');
        router.push('/my-listings');
      } else {
        const error = await response.json();
        alert(`Error updating listing: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating listing:', error);
      alert('Error updating listing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Redirect to login if user is not authenticated (and not loading)
  useEffect(() => {
    if (!authLoading && user === null) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white min-h-screen">
        {isMobile ? (
          <MobileNavbar
            where={where}
            setWhere={setWhere}
            dateRange={dateRange}
            setDateRange={setDateRange}
            onSearch={handleMobileSearch}
            isEditListingPage={true}
          />
        ) : (
          <Navbar />
        )}
        <LoadingPage />
      </div>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="max-w-2xl mx-auto mt-30 text-center">
            <h2 className="text-3xl font-bold mb-8 text-black">Which of these best describes your place?</h2>
            <div className="space-y-4">
              {[
                { value: 'house', label: 'House', icon: (
                  <img src="/icons/icons8-house-30.png" alt="House" className="w-6 h-6" />
                ) },
                { value: 'apartment', label: 'Apartment', icon: (
                  <img src="/icons/icons8-apartment-50.png" alt="Apartment" className="w-6 h-6" />
                ) }
              ].map(option => (
                <div
                  key={option.value}
                  onClick={() => handleInputChange('property_type', option.value)}
                  className={`flex items-center justify-between p-6 border-2 rounded-xl cursor-pointer hover:border-gray-500 transition-colors ${
                    formData.property_type === option.value
                      ? 'border-black'
                      : errors.property_type
                      ? 'border-red-500'
                      : 'border-gray-300'
                  }`}
                >
                  <span className="text-xl font-medium text-black">{option.label}</span>
                  <div className="w-8 h-8 flex items-center justify-center">
                    {option.icon}
                  </div>
                </div>
              ))}
              {renderError('property_type')}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="max-w-2xl mx-auto mt-30 text-center">
            <h2 className="text-3xl font-bold mb-8 text-black">What type of place will guests have?</h2>
            <div className="space-y-4">
              {[
                { value: 'entire_place', label: 'An entire place', description: 'Guests have the whole place to themselves', icon: (
                  <img src="/icons/icons8-home-50.png" alt="Home" className="w-6 h-6" />
                ) },
                { value: 'room', label: 'A room', description: 'Guests have their own room in a home, plus access to shared spaces', icon: (
                  <img src="/icons/icons8-room-64.png" alt="Room" className="w-6 h-6" />
                ) },
                { value: 'shared_room', label: 'A shared room', description: 'Guests sleep in a shared room with others', icon: (
                  <img src="/icons/icons8-group-30.png" alt="Group" className="w-6 h-6" />
                ) }
              ].map(option => (
                <div
                  key={option.value}
                  onClick={() => handleInputChange('guest_space', option.value)}
                  className={`flex items-center justify-between p-6 border-2 rounded-xl cursor-pointer hover:border-gray-500 transition-colors ${
                    formData.guest_space === option.value
                      ? 'border-black'
                      : errors.guest_space
                      ? 'border-red-500'
                      : 'border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-start text-left">
                    <span className="text-xl font-medium text-black">{option.label}</span>
                    <span className="text-sm text-gray-600">{option.description}</span>
                  </div>
                  <div className="w-8 h-8 flex items-center justify-center">
                    {option.icon}
                  </div>
                </div>
              ))}
              {renderError('guest_space')}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="max-w-6xl mx-auto mt-30">
            <h2 className="text-3xl font-bold mb-8 text-center text-black">Where's your place located?</h2>
            
            {!isMobile ? (
              /* Desktop Layout */
              <div className="flex gap-8">
                {/* Left Column - Address Form */}
                <div className="w-[55%] space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-black">Search for your address</label>
                    <GoogleMapsAutocomplete
                      onAddressSelect={handleAddressSelect}
                      className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm"
                      placeholder="Start typing your address..."
                    />
                    <p className="text-xs text-gray-600 mt-1">Type your address and select from the suggestions</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-black">Street address</label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        className={`w-full p-2 border rounded-lg text-black text-sm focus:outline-none focus:ring-1s:ring-black focus:border-black ${
                          errors.address ? 'border-red-500' : 'mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm'
                        }`}
                        placeholder="123 Main St"
                      />
                      {renderError('address')}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-black">Apt, unit, suite</label>
                      <input
                        type="text"
                        value={formData.unit}
                        onChange={(e) => handleInputChange('unit', e.target.value)}
                        className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm"
                        placeholder="Apt 3B"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-black">Neighborhood</label>
                      <input
                        type="text"
                      value={formData.neighborhood}
                        onChange={(e) => handleInputChange('neighborhood', e.target.value)}
                        className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm"
                        placeholder="Allston"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-black">City</label>
                      <input
                        type="text"
                      value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        className={`w-full p-2 border rounded-lg text-black text-sm focus:outline-none focus:ring-1s:ring-black focus:border-black ${
                          errors.city ? 'border-red-500' : 'mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm'
                        }`}
                        placeholder="Boston"
                      />
                    {renderError('city')}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-black">State</label>
                      <input
                        type="text"
                      value={formData.state}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        className={`w-full p-2 border rounded-lg text-black text-sm focus:outline-none focus:ring-1s:ring-black focus:border-black ${
                          errors.state ? 'border-red-500' : 'mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm'
                        }`}
                        placeholder="MA"
                      />
                    {renderError('state')}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-black">Zip code</label>
                      <input
                        type="text"
                      value={formData.zip}
                        onChange={(e) => handleInputChange('zip', e.target.value)}
                        className={`w-full p-2 border rounded-lg text-black text-sm focus:outline-none focus:ring-1s:ring-black focus:border-black ${
                          errors.zip ? 'border-red-500' : 'mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm'
                        }`}
                        placeholder="02115"
                      />
                    {renderError('zip')}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1 text-black">Country</label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      className={`w-full p-2 border rounded-lg text-black text-sm focus:outline-none focus:ring-1s:ring-black focus:border-black ${
                        errors.country ? 'border-red-500' : 'mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm'
                      }`}
                      placeholder="Country"
                    />
                    {renderError('country')}
                  </div>
                </div>

                {/* Right Column - Map Preview */}
                <div className="w-[45%] flex-shrink-0">
                  <label className="block text-sm font-medium mb-2 text-black">Map Preview</label>
                  <MapPreview
                    latitude={formData.latitude}
                    longitude={formData.longitude}
                    address={`${formData.address}, ${formData.city}, ${formData.state} ${formData.zip}`}
                    height="calc(100vh - 300px)"
                  />
                </div>
              </div>
            ) : (
              /* Mobile Layout - Map above, form below */
              <div className="flex flex-col gap-6">
                {/* Map Preview - Top */}
                <div className="w-full">
                  <MapPreview
                    latitude={formData.latitude}
                    longitude={formData.longitude}
                    address={`${formData.address}, ${formData.city}, ${formData.state} ${formData.zip}`}
                    height="300px"
                  />
                </div>

                {/* Address Form - Bottom */}
                <div className="w-full space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-black">Search for your address</label>
                    <GoogleMapsAutocomplete
                      onAddressSelect={handleAddressSelect}
                      className="w-full p-2 border border-gray-400 rounded-lg text-black text-sm focus:outline-none focus:ring-1s:ring-black focus:border-black"
                      placeholder="Start typing your address..."
                    />
                    <p className="text-xs text-gray-600 mt-1">Type your address and select from the suggestions</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-black">Street address</label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        className={`w-full p-2 border rounded-lg text-black text-sm focus:outline-none focus:ring-1s:ring-black focus:border-black ${
                          errors.address ? 'border-red-500' : 'border-gray-400'
                        }`}
                        placeholder="123 Main St"
                      />
                      {renderError('address')}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-black">Apt, unit, suite</label>
                      <input
                        type="text"
                        value={formData.unit}
                        onChange={(e) => handleInputChange('unit', e.target.value)}
                        className="w-full p-2 border border-gray-400 rounded-lg text-black text-sm focus:outline-none focus:ring-1s:ring-black focus:border-black"
                        placeholder="Apt 3B"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-black">Neighborhood</label>
                      <input
                        type="text"
                      value={formData.neighborhood}
                        onChange={(e) => handleInputChange('neighborhood', e.target.value)}
                        className="w-full p-2 border border-gray-400 rounded-lg text-black text-sm focus:outline-none focus:ring-1s:ring-black focus:border-black"
                        placeholder="Allston"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-black">City</label>
                      <input
                        type="text"
                      value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        className={`w-full p-2 border rounded-lg text-black text-sm focus:outline-none focus:ring-1s:ring-black focus:border-black ${
                          errors.city ? 'border-red-500' : 'border-gray-400'
                        }`}
                        placeholder="Boston"
                      />
                    {renderError('city')}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-black">State</label>
                      <input
                        type="text"
                      value={formData.state}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        className={`w-full p-2 border rounded-lg text-black text-sm focus:outline-none focus:ring-1s:ring-black focus:border-black ${
                          errors.state ? 'border-red-500' : 'border-gray-400'
                        }`}
                        placeholder="MA"
                      />
                    {renderError('state')}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-black">Zip code</label>
                      <input
                        type="text"
                      value={formData.zip}
                        onChange={(e) => handleInputChange('zip', e.target.value)}
                        className={`w-full p-2 border rounded-lg text-black text-sm focus:outline-none focus:ring-1s:ring-black focus:border-black ${
                          errors.zip ? 'border-red-500' : 'border-gray-400'
                        }`}
                        placeholder="02115"
                      />
                    {renderError('zip')}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1 text-black">Country</label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      className={`w-full p-2 border rounded-lg text-black text-sm focus:outline-none focus:ring-1s:ring-black focus:border-black ${
                        errors.country ? 'border-red-500' : 'border-gray-400'
                      }`}
                      placeholder="Country"
                    />
                    {renderError('country')}
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="max-w-2xl mx-auto mt-30">
            <h2 className="text-3xl font-bold mb-8 text-center text-black">How many people can stay here?</h2>
            <div className="space-y-6">
              {/* Guests */}
              <div className="flex items-center justify-between py-4 border-b border-gray-400">
                <div>
                  <h3 className="text-lg font-medium text-black">Guests</h3>
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => handleInputChange('max_occupancy', Math.max(1, formData.max_occupancy - 1))}
                    className="text-black text-2xl font-medium hover:text-gray-600 transition-colors"
                  >
                    -
                  </button>
                  <span className="w-16 text-center text-lg font-medium text-black">{formData.max_occupancy}</span>
                  <button
                    onClick={() => handleInputChange('max_occupancy', formData.max_occupancy + 1)}
                    className="text-black text-2xl font-medium hover:text-gray-600 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Bedrooms */}
              <div className="flex items-center justify-between py-4 border-b border-gray-400">
                <div>
                  <h3 className="text-lg font-medium text-black">Bedrooms</h3>
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => handleInputChange('bedrooms', Math.max(1, formData.bedrooms - 1))}
                    className="text-black text-2xl font-medium hover:text-gray-600 transition-colors"
                  >
                    -
                  </button>
                  <span className="w-16 text-center text-lg font-medium text-black">{formData.bedrooms}</span>
                  <button
                    onClick={() => handleInputChange('bedrooms', formData.bedrooms + 1)}
                    className="text-black text-2xl font-medium hover:text-gray-600 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Bathrooms */}
              <div className="flex items-center justify-between py-4">
                <div>
                  <h3 className="text-lg font-medium text-black">Bathrooms</h3>
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => handleInputChange('bathrooms', Math.max(1, formData.bathrooms - 0.5))}
                    className="text-black text-2xl font-medium hover:text-gray-600 transition-colors"
                  >
                    -
                  </button>
                  <span className="w-16 text-center text-lg font-medium text-black">{formData.bathrooms}</span>
                  <button
                    onClick={() => handleInputChange('bathrooms', formData.bathrooms + 0.5)}
                    className="text-black text-2xl font-medium hover:text-gray-600 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="max-w-4xl mx-auto mt-30 text-center">
            <h2 className="text-3xl font-bold mb-8 text-black">Who else might be there?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* First Column */}
              <div className="space-y-4">
                {occupants.slice(0, 2).map(occupant => (
                  <div
                    key={occupant.value}
                    onClick={() => handleOccupantToggle(occupant.value)}
                    className={`flex items-center justify-between p-6 border-2 rounded-xl cursor-pointer hover:border-gray-500 transition-colors ${
                      formData.occupants.includes(occupant.value)
                        ? 'border-black bg-gray-50'
                        : 'border-gray-300'
                    }`}
                  >
                    <span className="text-base font-medium text-black">{occupant.label}</span>
                    <span className="w-6 h-6 flex items-center justify-center border-2 rounded border-gray-400 bg-white">
                      {formData.occupants.includes(occupant.value) && (
                        <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              {/* Second Column */}
              <div className="space-y-4">
                {occupants.slice(2).map(occupant => (
                  <div
                    key={occupant.value}
                    onClick={() => handleOccupantToggle(occupant.value)}
                    className={`flex items-center justify-between p-6 border-2 rounded-xl cursor-pointer hover:border-gray-500 transition-colors ${
                      formData.occupants.includes(occupant.value)
                        ? 'border-black bg-gray-50'
                        : 'border-gray-300'
                    }`}
                  >
                    <span className="text-base font-medium text-black">{occupant.label}</span>
                    <span className="w-6 h-6 flex items-center justify-center border-2 rounded border-gray-400 bg-white">
                      {formData.occupants.includes(occupant.value) && (
                        <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 6:
        // Get living, college, and extra amenities
        const livingAmenities = amenities.filter(a => a.category === 'living');
        const collegeAmenities = amenities.filter(a => a.category === 'college');
        const extraAmenities = amenities.filter(a => a.category === 'extra');
        
        return (
          <div className="max-w-6xl mx-auto mt-30">
            <h2 className="text-3xl font-bold mb-8 text-center text-black">Amenities</h2>
            
            {/* Desktop Layout - 3 columns side by side */}
            <div className="hidden md:flex gap-8">
              {/* Living Essentials */}
              <div className="w-1/3">
                <h3 className="text-xl font-bold mb-4 text-black">Living Essentials</h3>
                <div className="space-y-3">
                  {livingAmenities.map(amenity => (
                    <div
                      key={amenity.code}
                      onClick={() => handleAmenityToggle(amenity.code)}
                      className={`flex items-center justify-between p-3 border-2 rounded-lg cursor-pointer hover:border-gray-500 transition-colors ${
                        formData.amenities.includes(amenity.code)
                          ? 'border-black bg-gray-50'
                          : 'border-gray-300'
                      }`}
                    >
                      <span className="text-sm text-black">{amenity.name}</span>
                      <span className="w-5 h-5 flex items-center justify-center border-2 rounded border-gray-400 bg-white">
                        {formData.amenities.includes(amenity.code) && (
                          <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* College Essentials */}
              <div className="w-1/3">
                <h3 className="text-xl font-bold mb-4 text-black">College Essentials</h3>
                <div className="space-y-3">
                  {collegeAmenities.map(amenity => (
                    <div
                      key={amenity.code}
                      onClick={() => handleAmenityToggle(amenity.code)}
                      className={`flex items-center justify-between p-3 border-2 rounded-lg cursor-pointer hover:border-gray-500 transition-colors ${
                        formData.amenities.includes(amenity.code)
                          ? 'border-black bg-gray-50'
                          : 'border-gray-300'
                      }`}
                    >
                      <span className="text-sm text-black">{amenity.name}</span>
                      <span className="w-5 h-5 flex items-center justify-center border-2 rounded border-gray-400 bg-white">
                        {formData.amenities.includes(amenity.code) && (
                          <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Extra */}
              <div className="w-1/3">
                <h3 className="text-xl font-bold mb-4 text-black">Extra</h3>
                <div className="space-y-3">
                  {extraAmenities.map(amenity => (
                    <div
                      key={amenity.code}
                      onClick={() => handleAmenityToggle(amenity.code)}
                      className={`flex items-center justify-between p-3 border-2 rounded-lg cursor-pointer hover:border-gray-500 transition-colors ${
                        formData.amenities.includes(amenity.code)
                          ? 'border-black bg-gray-50'
                          : 'border-gray-300'
                      }`}
                    >
                      <span className="text-sm text-black">{amenity.name}</span>
                      <span className="w-5 h-5 flex items-center justify-center border-2 rounded border-gray-400 bg-white">
                        {formData.amenities.includes(amenity.code) && (
                          <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile Layout - Single column */}
            <div className="md:hidden">
              {/* Living Essentials */}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 text-black">Living Essentials</h3>
                <div className="space-y-3">
                  {livingAmenities.map(amenity => (
                    <div
                      key={amenity.code}
                      onClick={() => handleAmenityToggle(amenity.code)}
                      className={`flex items-center justify-between p-3 border-2 rounded-lg cursor-pointer hover:border-gray-500 transition-colors ${
                        formData.amenities.includes(amenity.code)
                          ? 'border-black bg-gray-50'
                          : 'border-gray-300'
                      }`}
                    >
                      <span className="text-sm text-black">{amenity.name}</span>
                      <span className="w-5 h-5 flex items-center justify-center border-2 rounded border-gray-400 bg-white">
                        {formData.amenities.includes(amenity.code) && (
                          <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* College Essentials */}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 text-black">College Essentials</h3>
                <div className="space-y-3">
                  {collegeAmenities.map(amenity => (
                    <div
                      key={amenity.code}
                      onClick={() => handleAmenityToggle(amenity.code)}
                      className={`flex items-center justify-between p-3 border-2 rounded-lg cursor-pointer hover:border-gray-500 transition-colors ${
                        formData.amenities.includes(amenity.code)
                          ? 'border-black bg-gray-50'
                          : 'border-gray-300'
                      }`}
                    >
                      <span className="text-sm text-black">{amenity.name}</span>
                      <span className="w-5 h-5 flex items-center justify-center border-2 rounded border-gray-400 bg-white">
                        {formData.amenities.includes(amenity.code) && (
                          <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Extra */}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 text-black">Extra</h3>
                <div className="space-y-3">
                  {extraAmenities.map(amenity => (
                    <div
                      key={amenity.code}
                      onClick={() => handleAmenityToggle(amenity.code)}
                      className={`flex items-center justify-between p-3 border-2 rounded-lg cursor-pointer hover:border-gray-500 transition-colors ${
                        formData.amenities.includes(amenity.code)
                          ? 'border-black bg-gray-50'
                          : 'border-gray-300'
                      }`}
                    >
                      <span className="text-sm text-black">{amenity.name}</span>
                      <span className="w-5 h-5 flex items-center justify-center border-2 rounded border-gray-400 bg-white">
                        {formData.amenities.includes(amenity.code) && (
                          <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="max-w-4xl mx-auto mt-30">
            <h2 className="text-3xl font-bold mb-8 text-center text-black">Upload photos</h2>
                           <PhotoUpload
                 photos={formData.photos}
                 onPhotosChange={(newPhotos) => setFormData(prev => ({ ...prev, photos: newPhotos }))}
                 maxPhotos={7}
                 minPhotos={5}
               />
          </div>
        );

      case 8:
        return (
          <div className="max-w-2xl mx-auto mt-30 text-center">
            <h2 className="text-3xl font-bold mb-8 text-black">Write a title</h2>
            <p className="text-lg text-gray-600 mb-8">Short titles work best. Have fun with it—you can always change it later.</p>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={`w-full p-6 border text-center border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm ${
                errors.title ? 'border-red-500' : ''
              }`}
              placeholder="Room near campus"
              maxLength={30}
            />
            <div className="text-sm text-gray-500 mt-2">
              {formData.title.length}/30 characters
            </div>
            {renderError('title')}
          </div>
        );

      case 9:
        return (
          <div className="max-w-2xl mx-auto mt-30 text-center">
            <h2 className="text-3xl font-bold mb-8 text-black">Write a description</h2>
            <p className="text-lg text-gray-600 mb-8">Tell guests what makes your place special.</p>
            <div className="relative flex justify-center mb-2" style={{ maxWidth: 600, margin: '0 auto' }}>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className={`w-full p-6 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-black focus:border-black focus:z-10 sm:text-sm h-80 resize-none ${
                  errors.description ? 'border-red-500' : ''
                }`}
                placeholder="Describe your place..."
                maxLength={500}
                style={{ maxWidth: 600 }}
              />
              <button
                type="button"
                onClick={handleAiSuggestAbout}
                disabled={aiAboutLoading}
                className="absolute bottom-3 right-3 font-semibold rounded-full transition-colors disabled:opacity-50 border-0 focus:outline-none shadow-lg"
                style={{
                  background: 'linear-gradient(90deg, #19e3cf 0%, #7b5cff 100%)',
                  padding: '1.5px',
                  borderRadius: '9999px',
                  zIndex: 10,
                }}
                title="Suggest about section with AI"
              >
                <span
                  className="flex items-center justify-center px-3 py-1.5 rounded-full"
                  style={{
                    background: '#f7f7fa',
                    color: '#444',
                    fontWeight: 600,
                    fontSize: '1rem',
                    borderRadius: '9999px',
                  }}
                >
                  <img
                    src="/icons/sparkler.png"
                    alt="Sparkle"
                    className="w-4 h-4 mr-1"
                    style={{ display: 'inline-block', verticalAlign: 'middle' }}
                  />
                  {aiAboutLoading ? '...' : 'Generate'}
                </span>
              </button>
            </div>
            <div className="text-sm text-gray-500 mt-2">
              {formData.description.length}/500 characters
            </div>
            {renderError('description')}
            {aiAboutError && <div className="text-red-500 text-sm mt-2">{aiAboutError}</div>}
          </div>
        );

      case 10:
        return (
          <div className="max-w-2xl mx-auto mt-30 text-center">
            <h2 className="text-3xl font-bold mb-8 text-black">Price per night</h2>
            {/* Main Price Display */}
            <div className="mb-8">
              <div className="flex items-center justify-center gap-4">
                <div className="text-6xl font-bold text-black relative flex items-center justify-center gap-4">
                  {isEditing ? (
                    <input
                      type="text"
                      value={Number.isFinite(formData.price_per_night) ? formData.price_per_night : ""}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.]/g, '');
                        handleInputChange('price_per_night', value === "" ? 0 : parseFloat(value) || 0);
                      }}
                      onBlur={() => setIsEditing(false)}
                      className="text-6xl font-bold text-black bg-transparent border-none outline-none w-full text-center"
                      placeholder="0"
                      autoFocus
                    />
                  ) : (
                    <>
                      <span>${Number.isFinite(formData.price_per_night) ? formData.price_per_night : 0}</span>
                      <button 
                        onClick={() => setIsEditing(true)}
                        className="w-8 h-8 bg-white border border-gray-600 rounded-full flex items-center justify-center hover:bg-gray-50 shadow-sm ml-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
              <span className="text-gray-500 text-sm mt-4 block">This is the nightly price guests will see for your listing.</span>
            </div>
            {/* Price Breakdown */}
          </div>
        );

      case 11:
        return (
          <div className="max-w-2xl mx-auto mt-30 text-center">
            <h2 className="text-3xl font-bold mb-8 text-black">Set your booking period</h2>
            <p className="text-lg text-gray-600 mb-8">Choose when guests can check in and check out</p>
            <div className="space-y-6">
              <div className="relative">
                <div 
                  className="w-full p-4 border border-gray-300 rounded-lg text-black cursor-pointer hover:border-gray-600 focus-within:ring-1 focus-within:ring-black focus-within:border-black"
                  onClick={() => setShowCalendar(!showCalendar)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm text-gray-500">Check in</div>
                      <div className="text-black">
                        {formData.start_date ? (() => {
                          const date = new Date(formData.start_date + 'T00:00:00');
                          return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toLocaleDateString();
                        })() : 'Select check-in date'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Check out</div>
                      <div className="text-black">
                        {formData.end_date ? (() => {
                          const date = new Date(formData.end_date + 'T00:00:00');
                          return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toLocaleDateString();
                        })() : 'Select check-out date'}
                      </div>
                    </div>
                  </div>
                  {/* Add nights counter when both dates are selected */}
                  {formData.start_date && formData.end_date && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-sm text-gray-600 text-center">
                        {(() => {
                          const startDate = new Date(formData.start_date + 'T00:00:00');
                          const endDate = new Date(formData.end_date + 'T00:00:00');
                          const nights = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                          return `${nights} night${nights !== 1 ? 's' : ''} available for booking`;
                        })()}
                      </div>
                    </div>
                  )}
                </div>
                {showCalendar && (
                  <div className="absolute top-full left-0 mt-2 z-50 calendar-container">
                    <CompactCalendar
                      value={{
                        startDate: formData.start_date ? (() => {
                          const date = new Date(formData.start_date + 'T00:00:00');
                          return new Date(date.getFullYear(), date.getMonth(), date.getDate());
                        })() : null,
                        endDate: formData.end_date ? (() => {
                          const date = new Date(formData.end_date + 'T00:00:00');
                          return new Date(date.getFullYear(), date.getMonth(), date.getDate());
                        })() : null
                      }}
                      onChange={handleCalendarChange}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="bg-white min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
            <p className="text-gray-600">Loading listing...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen flex flex-col">
      {isMobile ? (
        <MobileNavbar
          where={where}
          setWhere={setWhere}
          dateRange={dateRange}
          setDateRange={setDateRange}
          onSearch={handleMobileSearch}
          isEditListingPage={true}
        />
      ) : (
        <Navbar />
      )}
      <div className="flex-1 flex flex-col">

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center px-6 py-8 pt-4 relative">
          <div className="w-full max-w-4xl">
            {renderStep()}
          </div>
          {/* Close Button */}
          {!isMobile && (
            <div className="absolute top-31 right-13 z-10">
              <button
                onClick={() => router.push('/my-listings')}
                className="w-10 h-10 bg-white border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 hover:border-gray-400 transition-colors shadow-sm"
                title="Exit to My Listings"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
        
        {/* Error Message Centered Above Progress Bar */}
        {errors.photos && currentStep === 7 && (
          <div className="w-full flex justify-center mb-2">
            <div className="text-red-500 text-sm mt-1 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errors.photos}
            </div>
          </div>
        )}
        {errors.amenities && currentStep === 6 && (
          <div className="w-full flex justify-center mb-2">
            <div className="text-red-500 text-sm mt-1 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errors.amenities}
            </div>
          </div>
        )}
        {errors.title && currentStep === 8 && (
          <div className="w-full flex justify-center mb-2">
            <div className="text-red-500 text-sm mt-1 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errors.title}
            </div>
          </div>
        )}
        {errors.description && currentStep === 9 && (
          <div className="w-full flex justify-center mb-2">
            <div className="text-red-500 text-sm mt-1 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errors.description}
            </div>
          </div>
        )}
        {(errors.start_date || errors.end_date) && currentStep === 11 && (
          <div className="w-full flex justify-center mb-2">
            <div className="text-red-500 text-sm mt-1 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errors.start_date || errors.end_date}
            </div>
          </div>
        )}

        {/* Progress Bar and Navigation */}
        <div className="bg-white">
          <div className="max-w-4xl mx-auto px-6 py-6">
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-medium text-gray-600">Step {currentStep} of 11</span>
                <span className="text-sm font-medium text-gray-600">{Math.round((currentStep / 11) * 100)}% complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div 
                  className="bg-black h-1 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(currentStep / 11) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Navigation Arrows */}
            <div className="flex justify-between items-center">
              {currentStep > 1 ? (
          <button
            onClick={prevStep}
                  className="text-black hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
          </button>
              ) : (
                <div></div>
              )}
              
              {currentStep < 11 ? (
                <button
                  onClick={nextStep}
                  className="text-black hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
            <button
              onClick={handleSubmit}
                  className="text-black hover:text-gray-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={submitting}
                >
                  <span className="font-medium">{submitting ? "Updating..." : "Update Listing"}</span>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>


    </div>
  );
} 