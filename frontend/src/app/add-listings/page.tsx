"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../hooks/useAuth';
import GoogleMapsAutocomplete from '../../components/GoogleMapsAutocomplete';
import MapPreview from '../../components/MapPreview';

interface FormData {
  property_type: 'house' | 'apartment';
  guest_space: 'entire_place' | 'room' | 'shared_room';
  address: string;
  unit: string; // Added unit field
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
  photos: File[];
  title: string;
  description: string;
  price_per_night: number;
  start_date: string;
  end_date: string;
}

export default function BecomeHost() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    property_type: 'apartment',
    guest_space: 'entire_place',
    address: '',
    unit: '', // Added unit field
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
  const [submitting, setSubmitting] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const amenities = [
    // Living Essentials
    { code: 'wifi', name: 'Wi-Fi', category: 'living' },
    { code: 'tv', name: 'TV', category: 'living' },
    { code: 'kitchen', name: 'Kitchen', category: 'living' },
    { code: 'washer', name: 'Washer', category: 'living' },
    { code: 'air_conditioning', name: 'Air conditioning', category: 'living' },
    { code: 'free_parking', name: 'Free parking', category: 'living' },
    { code: 'paid_parking', name: 'Paid parking', category: 'living' },
    
    // College Essentials
    { code: 'dedicated_workspace', name: 'Dedicated workspace', category: 'college' },
    { code: 'quiet_study', name: 'Quiet study area', category: 'college' },
    { code: 'high_speed_internet', name: 'High-speed Wi-Fi', category: 'college' },
    { code: 'printer_access', name: 'Printer access', category: 'college' },
    { code: 'coffee_station', name: 'Coffee station', category: 'college' },
    { code: 'whiteboard', name: 'Whiteboard', category: 'college' },
    { code: 'group_study', name: 'Group study area', category: 'college' },
    
    // Extra
    { code: 'pool', name: 'Pool', category: 'extra' },
    { code: 'hot_tub', name: 'Hot tub', category: 'extra' },
    { code: 'patio', name: 'Patio', category: 'extra' },
    { code: 'bbq_grill', name: 'BBQ grill', category: 'extra' },
    { code: 'outdoor_dining', name: 'Outdoor dining area', category: 'extra' },
    { code: 'fire_pit', name: 'Fire pit', category: 'extra' },
    { code: 'pool_table', name: 'Pool table', category: 'extra' },
    { code: 'indoor_fireplace', name: 'Indoor fireplace', category: 'extra' },
    { code: 'piano', name: 'Piano', category: 'extra' },
    { code: 'gym_access', name: 'Exercise equipment', category: 'extra' },
    { code: 'lake_access', name: 'Lake access', category: 'extra' },
    { code: 'beach_access', name: 'Beach access', category: 'extra' },
    { code: 'outdoor_shower', name: 'Outdoor shower', category: 'extra' }
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

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, ...files].slice(0, 7) // Keep max 7 photos
    }));
    // Reset the input value to allow re-uploading the same file
    e.target.value = '';
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
          newErrors.start_date = 'Start date is required';
        }
        if (!formData.end_date) {
          newErrors.end_date = 'End date is required';
        }
        if (formData.start_date && formData.end_date && new Date(formData.start_date) >= new Date(formData.end_date)) {
          newErrors.end_date = 'End date must be after start date';
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
        setErrors({}); // Clear errors when moving to next step
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
    
    // Validate all steps before submitting
    let allValid = true;
    for (let step = 1; step <= 11; step++) {
      if (!validateStep(step)) {
        allValid = false;
        break;
      }
    }
    
    if (!allValid) {
      alert('Please complete all required fields before submitting.');
      setSubmitting(false);
      return;
    }
    
    setSubmitting(true);
    if (!user || !profile) {
      alert('Please log in to create a listing');
      setSubmitting(false);
      return;
    }

    console.log('User data:', { user, profile });

    if (!user.id) {
      alert('User ID is missing. Please log in again.');
      setSubmitting(false);
      return;
    }

    try {
      // Create FormData for file upload
      const submitData = new FormData();
      submitData.append('user_id', user.id);
      submitData.append('property_type', formData.property_type);
      submitData.append('guest_space', formData.guest_space);
      submitData.append('address', formData.address);
      submitData.append('unit', formData.unit);
      submitData.append('city', formData.city);
      submitData.append('state', formData.state);
      submitData.append('zip', formData.zip);
      submitData.append('country', formData.country);
      submitData.append('neighborhood', formData.neighborhood);
      if (formData.latitude) submitData.append('latitude', formData.latitude.toString());
      if (formData.longitude) submitData.append('longitude', formData.longitude.toString());
      submitData.append('max_occupancy', formData.max_occupancy.toString());
      submitData.append('bedrooms', formData.bedrooms.toString());
      submitData.append('bathrooms', formData.bathrooms.toString());
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      submitData.append('price_per_night', formData.price_per_night.toString());
      submitData.append('start_date', formData.start_date);
      submitData.append('end_date', formData.end_date);
      submitData.append('amenities', JSON.stringify(formData.amenities));
      submitData.append('occupants', JSON.stringify(formData.occupants));

      // Add photos
      formData.photos.forEach((photo, index) => {
        submitData.append(`photos`, photo);
      });

      console.log('Submitting form data:', {
        user_id: user.id,
        property_type: formData.property_type,
        guest_space: formData.guest_space,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        price_per_night: formData.price_per_night,
        start_date: formData.start_date,
        end_date: formData.end_date,
        amenities: formData.amenities,
        occupants: formData.occupants,
        photos_count: formData.photos.length
      });

      console.log('Making request to:', 'http://localhost:4000/api/listings');
      
      const response = await fetch('http://localhost:4000/api/listings', {
        method: 'POST',
        body: submitData
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        router.push('/my-listings');
      } else {
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        console.log('Response content-type:', contentType);
        
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          console.log('JSON error response:', errorData);
          alert(`Error creating listing: ${errorData.message || errorData.error || 'Unknown error'}`);
        } else {
          // Handle HTML error response
          const errorText = await response.text();
          console.error('Server returned HTML error:', errorText);
          alert('Error creating listing. Please check the console for details.');
        }
      }
    } catch (error) {
      console.error('Error creating listing:', error);
      alert('Error creating listing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveProgress = async () => {
    if (savingProgress) return;
    
    setSavingProgress(true);
    if (!user || !profile) {
      alert('Please log in to save progress');
      setSavingProgress(false);
      return;
    }

    if (!user.id) {
      alert('User ID is missing. Please log in again.');
      setSavingProgress(false);
      return;
    }

    try {
      // Create FormData for file upload
      const submitData = new FormData();
      submitData.append('user_id', user.id);
      submitData.append('property_type', formData.property_type);
      submitData.append('guest_space', formData.guest_space);
      submitData.append('address', formData.address);
      submitData.append('unit', formData.unit);
      submitData.append('city', formData.city);
      submitData.append('state', formData.state);
      submitData.append('zip', formData.zip);
      submitData.append('country', formData.country);
      submitData.append('neighborhood', formData.neighborhood);
      if (formData.latitude) submitData.append('latitude', formData.latitude.toString());
      if (formData.longitude) submitData.append('longitude', formData.longitude.toString());
      submitData.append('max_occupancy', formData.max_occupancy.toString());
      submitData.append('bedrooms', formData.bedrooms.toString());
      submitData.append('bathrooms', formData.bathrooms.toString());
      // Set default title if not filled out yet
      const defaultTitle = formData.title && formData.title.trim() !== '' 
        ? formData.title 
        : 'Draft Listing';
      submitData.append('title', defaultTitle);
      submitData.append('description', formData.description);
      submitData.append('price_per_night', formData.price_per_night.toString());
      // Provide default dates if not set
      const today = new Date();
      const defaultStartDate = formData.start_date && formData.start_date.trim() !== '' 
        ? formData.start_date 
        : today.toISOString().split('T')[0];
      const defaultEndDate = formData.end_date && formData.end_date.trim() !== '' 
        ? formData.end_date 
        : new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 1 year from today
      
      submitData.append('start_date', defaultStartDate);
      submitData.append('end_date', defaultEndDate);
      submitData.append('amenities', JSON.stringify(formData.amenities));
      submitData.append('occupants', JSON.stringify(formData.occupants));
      submitData.append('status', 'inactive'); // Save as inactive

      // Add photos
      formData.photos.forEach((photo, index) => {
        submitData.append(`photos`, photo);
      });

      const response = await fetch('http://localhost:4000/api/listings', {
        method: 'POST',
        body: submitData
      });

      if (response.ok) {
        alert('Progress saved successfully! Your listing has been saved as inactive.');
        router.push('/my-listings');
      } else {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          alert(`Error saving progress: ${errorData.message || errorData.error || 'Unknown error'}`);
        } else {
          const errorText = await response.text();
          console.error('Server returned HTML error:', errorText);
          alert('Error saving progress. Please check the console for details.');
        }
      }
    } catch (error) {
      console.error('Error saving progress:', error);
      alert('Error saving progress. Please try again.');
    } finally {
      setSavingProgress(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="max-w-2xl mx-auto mt-30 text-center">
            <h2 className="text-3xl font-bold mb-8 text-black">Which of these best describes your place?</h2>
            <div className="space-y-4">
              {[
                { value: 'house', label: 'House', icon: (
                  <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                  </svg>
                ) },
                { value: 'apartment', label: 'Apartment', icon: (
                  <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                  </svg>
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
                  <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                  </svg>
                ) },
                { value: 'room', label: 'A room', description: 'Guests have their own room in a home, plus access to shared spaces', icon: (
                  <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="3" y="10" width="18" height="7" rx="2" fill="currentColor" stroke="currentColor" />
                    <rect x="6" y="7" width="5" height="4" rx="2" fill="currentColor" stroke="currentColor" />
                    <rect x="15" y="7" width="3" height="4" rx="1.5" fill="currentColor" stroke="currentColor" />
                  </svg>
                ) },
                { value: 'shared_room', label: 'A shared room', description: 'Guests sleep in a shared room with others', icon: (
                  <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                  </svg>
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
          <div className="max-w-4xl mx-auto mt-30">
            <h2 className="text-3xl font-bold mb-8 text-center text-black">Where's your place located?</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Address Form */}
              <div className="space-y-4">
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
                    placeholder="USA"
                  />
                  {renderError('country')}
                </div>
              </div>

              {/* Right Column - Map Preview */}
              <div>
                <MapPreview
                  latitude={formData.latitude}
                  longitude={formData.longitude}
                  address={`${formData.address}, ${formData.city}, ${formData.state} ${formData.zip}`}
                  height="400px"
                />
              </div>
            </div>
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
                    onClick={() => {
                      setFormData(prev => {
                        let newOccupants = prev.occupants.includes(occupant.value)
                          ? prev.occupants.filter(o => o !== occupant.value)
                          : [...prev.occupants, occupant.value];
                        return { ...prev, occupants: newOccupants };
                      });
                    }}
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
                    onClick={() => {
                      setFormData(prev => {
                        let newOccupants = prev.occupants.includes(occupant.value)
                          ? prev.occupants.filter(o => o !== occupant.value)
                          : [...prev.occupants, occupant.value];
                        return { ...prev, occupants: newOccupants };
                      });
                    }}
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
        // Split extra amenities
        const extraAmenities = amenities.filter(a => a.category === 'extra');
        const extraCol1 = extraAmenities.slice(0, 7);
        const extraCol2 = extraAmenities.slice(7);
        return (
          <div className="max-w-6xl mx-auto mt-30">
            <h2 className="text-3xl font-bold mb-8 text-center text-black">Amenities</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                            {/* Living Essentials */}
              <div>
                <h3 className="text-xl font-bold mb-4 text-black">Living Essentials</h3>
                <div className="space-y-3">
                  {amenities.filter(amenity => amenity.category === 'living').map(amenity => (
                    <div
                      key={amenity.code}
                      onClick={() => handleAmenityToggle(amenity.code)}
                      className={`flex items-center justify-between p-3 border border-gray-400 rounded-lg cursor-pointer hover:border-gray-500 transition-colors ${
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
              <div>
                <h3 className="text-xl font-bold mb-4 text-black">College Essentials</h3>
                <div className="space-y-3">
                  {amenities.filter(amenity => amenity.category === 'college').map(amenity => (
                    <div
                      key={amenity.code}
                      onClick={() => handleAmenityToggle(amenity.code)}
                      className={`flex items-center justify-between p-3 border border-gray-400 rounded-lg cursor-pointer hover:border-gray-500 transition-colors ${
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

              {/* Extra - Column 1 */}
              <div>
                <h3 className="text-xl font-bold mb-4 text-black">Extra</h3>
                <div className="space-y-3">
                  {extraCol1.map(amenity => (
                    <div
                      key={amenity.code}
                      onClick={() => handleAmenityToggle(amenity.code)}
                      className={`flex items-center justify-between p-3 border border-gray-400 rounded-lg cursor-pointer hover:border-gray-500 transition-colors ${
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

              {/* Extra - Column 2 */}
              <div>
                <h3 className="text-xl font-bold mb-4 text-black">&nbsp;</h3>
                <div className="space-y-3">
                  {extraCol2.map(amenity => (
                    <div
                      key={amenity.code}
                      onClick={() => handleAmenityToggle(amenity.code)}
                      className={`flex items-center justify-between p-3 border border-gray-400 rounded-lg cursor-pointer hover:border-gray-500 transition-colors ${
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
          <div className="max-w-4xl mx-auto mt-30 text-center">
            <h2 className="text-3xl font-bold mb-8 text-black">Upload photos</h2>
            {formData.photos.length === 0 ? (
              <div className="border-2 border-dashed border-gray-400 rounded-xl p-8 hover:border-gray-500 transition-colors relative">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handlePhotoUpload}
                  className="w-full h-full absolute inset-0 opacity-0 cursor-pointer"
              key={`file-input-${currentStep}`}
            />
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-8 h-8 text-black" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <p className="text-lg text-gray-600">Click to upload photos</p>
                  <p className="text-sm text-gray-500 mt-2">Drag and drop or click to browse</p>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:[grid-template-columns:2fr_1fr_1fr] md:grid-rows-2 gap-4 rounded-3xl overflow-hidden" style={{ height: '500px', minHeight: '300px', maxWidth: '1400px', width: '100%' }}>
                  {/* First column: one big image spanning two rows */}
                  <div className="relative md:row-span-2 h-full w-full">
                    {formData.photos[0] ? (
                      <>
                        <img
                          src={URL.createObjectURL(formData.photos[0])}
                          alt="Preview 1"
                          className="w-full h-full object-cover rounded-2xl"
                          style={{ height: '100%', width: '100%', objectFit: 'cover' }}
                        />
                        <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white px-3 py-1 rounded-lg text-sm font-medium">
                          Cover Photo
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              photos: prev.photos.filter((_, i) => i !== 0)
                            }));
                          }}
                          className="absolute top-2 right-2 bg-black text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-gray-800"
                        >
                          ×
                        </button>
                      </>
                    ) : (
                      <div className="border-2 border-dashed border-gray-400 rounded-2xl h-full w-full hover:border-gray-500 transition-colors relative flex items-center justify-center">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="w-full h-full absolute inset-0 opacity-0 cursor-pointer"
                          key={`file-input-cover-${currentStep}`}
                        />
                        <div className="text-center">
                          <div className="w-12 h-12 mx-auto mb-2 flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
                            </svg>
                          </div>
                          <p className="text-sm text-gray-500">Add photo</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Second column: two stacked images */}
                  {[1, 2].map((index) => (
                    <div key={index} className="relative h-full w-full">
                      {formData.photos[index] ? (
                        <>
                          <img
                            src={URL.createObjectURL(formData.photos[index])}
                        alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover rounded-2xl"
                            style={{ height: '100%', width: '100%', objectFit: 'cover' }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            photos: prev.photos.filter((_, i) => i !== index)
                          }));
                        }}
                            className="absolute top-2 right-2 bg-black text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-gray-800"
                      >
                        ×
                      </button>
                        </>
                      ) : (
                        <div className="border-2 border-dashed border-gray-400 rounded-2xl h-full w-full hover:border-gray-500 transition-colors relative flex items-center justify-center">
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="w-full h-full absolute inset-0 opacity-0 cursor-pointer"
                            key={`file-input-${index}-${currentStep}`}
                          />
                          <div className="text-center">
                            <div className="w-8 h-8 mx-auto mb-1 flex items-center justify-center">
                              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
                              </svg>
                            </div>
                            <p className="text-xs text-gray-500">Add</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {/* Third column: two stacked images */}
                  {[3, 4].map((index) => (
                    <div key={index} className="relative h-full w-full">
                      {formData.photos[index] ? (
                        <>
                          <img
                            src={URL.createObjectURL(formData.photos[index])}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover rounded-2xl"
                            style={{ height: '100%', width: '100%', objectFit: 'cover' }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                photos: prev.photos.filter((_, i) => i !== index)
                              }));
                            }}
                            className="absolute top-2 right-2 bg-black text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-gray-800"
                          >
                            ×
                          </button>
                        </>
                      ) : (
                        <div className="border-2 border-dashed border-gray-400 rounded-2xl h-full w-full hover:border-gray-500 transition-colors relative flex items-center justify-center">
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="w-full h-full absolute inset-0 opacity-0 cursor-pointer"
                            key={`file-input-${index}-${currentStep}`}
                          />
                          <div className="text-center">
                            <div className="w-8 h-8 mx-auto mb-1 flex items-center justify-center">
                              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
                              </svg>
                            </div>
                            <p className="text-xs text-gray-500">Add</p>
                </div>
              </div>
                      )}
                    </div>
                  ))}
                </div>
                {/* Add More Photos Button */}
                {formData.photos.length >= 5 && (
                  <div className="mt-6 flex justify-center gap-4">
                    {formData.photos.length < 7 && (
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.multiple = true;
                          input.accept = 'image/*';
                          input.onchange = (e) => {
                            const files = Array.from((e.target as HTMLInputElement).files || []);
                            const newPhotos = [...formData.photos, ...files].slice(0, 7);
                            setFormData(prev => ({ ...prev, photos: newPhotos }));
                          };
                          input.click();
                        }}
                        className="inline-flex items-center gap-2 px-6 py-3 border-2 border-gray-400 rounded-lg text-gray-700 hover:border-gray-500 hover:bg-gray-50 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add More Photos
                      </button>
                    )}
                    {formData.photos.length > 5 && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowPhotoModal(true);
                          setCurrentPhotoIndex(0);
                        }}
                        className="inline-flex items-center gap-2 px-6 py-3 border-2 border-gray-400 rounded-lg text-gray-700 hover:border-gray-500 hover:bg-gray-50 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View All Photos ({formData.photos.length})
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
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
              className="w-full p-6 border border-gray-600 rounded-lg text-black text-lg text-center focus:outline-none focus:ring-1 focus:ring-black"
              placeholder="Room near campus"
              maxLength={30}
            />
            <div className="text-sm text-gray-500 mt-2">
              {formData.title.length}/30 characters
            </div>
          </div>
        );

      case 9:
        return (
          <div className="max-w-2xl mx-auto mt-30 text-center">
            <h2 className="text-3xl font-bold mb-8 text-black">Write a description</h2>
            <p className="text-lg text-gray-600 mb-8">Tell guests what makes your place special.</p>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
                                      className="w-full p-6 border border-gray-600 rounded-lg h-48 resize-none text-black text-lg"
              placeholder="Describe your place..."
                maxLength={500}
            />
              <div className="text-sm text-gray-500 mt-2">
                {formData.description.length}/500 characters
              </div>
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
            <h2 className="text-3xl font-bold mb-8 text-black">Availability dates</h2>
            <div className="space-y-6">
              <div className="relative">
                <input
                  type="date"
                  placeholder=" "
                  value={formData.start_date}
                  onChange={(e) => handleInputChange('start_date', e.target.value)}
                  className="w-full p-4 border border-gray-400 rounded-lg text-black appearance-none focus:outline-none focus:ring-2 focus:ring-black hide-date-placeholder"
                  style={{ WebkitTextFillColor: formData.start_date ? undefined : 'transparent' }}
                />
                {!formData.start_date && (
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none select-none">Start date</span>
                )}
              </div>
              <div className="relative">
                <input
                  type="date"
                  placeholder=" "
                  value={formData.end_date}
                  onChange={(e) => handleInputChange('end_date', e.target.value)}
                  className="w-full p-4 border border-gray-400 rounded-lg text-black appearance-none focus:outline-none focus:ring-2 focus:ring-black hide-date-placeholder"
                  style={{ WebkitTextFillColor: formData.end_date ? undefined : 'transparent' }}
                />
                {!formData.end_date && (
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none select-none">End date</span>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!user) {
    return (
      <div className="bg-white min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4 text-black">Please log in to create a listing</h1>
            <button
              onClick={() => router.push('/login')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Log In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col">
        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center px-6 py-8 pt-4">
          <div className="w-full max-w-4xl">
            {renderStep()}
          </div>
        </div>

        {/* Error Message Centered Above Progress Bar */}
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
                <span className="font-medium">{submitting ? "Creating..." : "Create Listing"}</span>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Photo Modal */}
      {showPhotoModal && formData.photos.length > 0 && (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-[9999]" onClick={() => setShowPhotoModal(false)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full mx-4" onClick={(e) => e.stopPropagation()}>
            {/* Close button */}
            <button
              onClick={() => setShowPhotoModal(false)}
              className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-75 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Main photo */}
            <div className="relative">
              <img
                src={URL.createObjectURL(formData.photos[currentPhotoIndex])}
                alt={`Photo ${currentPhotoIndex + 1}`}
                className="w-full h-full object-contain max-h-[70vh] rounded-lg"
              />
              
              {/* Photo counter */}
              <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-lg text-sm">
                {currentPhotoIndex + 1} of {formData.photos.length}
              </div>
            </div>

            {/* Navigation buttons */}
            {formData.photos.length > 1 && (
              <>
                {currentPhotoIndex > 0 && (
                  <button
                    onClick={() => setCurrentPhotoIndex(prev => prev - 1)}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-opacity-75 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                {currentPhotoIndex < formData.photos.length - 1 && (
                  <button
                    onClick={() => setCurrentPhotoIndex(prev => prev + 1)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-opacity-75 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                )}
              </>
            )}

            {/* Thumbnail strip */}
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
              {formData.photos.map((photo, index) => (
                <div key={index} className="relative flex-shrink-0">
                  <button
                    onClick={() => setCurrentPhotoIndex(index)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      index === currentPhotoIndex ? 'border-black' : 'border-gray-400'
                    }`}
                  >
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                  <button
                    onClick={() => {
                      const newPhotos = formData.photos.filter((_, i) => i !== index);
                      setFormData(prev => ({
                        ...prev,
                        photos: newPhotos
                      }));
                      
                      // If we're deleting the last photo, close the modal
                      if (newPhotos.length === 0) {
                        setShowPhotoModal(false);
                        return;
                      }
                      
                      // Adjust current photo index if needed
                      if (currentPhotoIndex >= index && currentPhotoIndex > 0) {
                        setCurrentPhotoIndex(prev => prev - 1);
                      } else if (currentPhotoIndex >= newPhotos.length) {
                        setCurrentPhotoIndex(newPhotos.length - 1);
                      }
                    }}
                    className="absolute top-1 right-1 bg-black text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-gray-800"
                  >
                    ×
                  </button>
                </div>
              ))}
              {formData.photos.length < 7 && (
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 border-2 border-dashed border-gray-400 rounded-lg flex items-center justify-center hover:border-gray-500 transition-colors relative">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        const newPhotos = [...formData.photos, ...files].slice(0, 7);
                        setFormData(prev => ({ ...prev, photos: newPhotos }));
                      }}
                      className="w-full h-full absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
