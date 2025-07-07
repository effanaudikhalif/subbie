"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../hooks/useAuth';

interface FormData {
  property_type: 'house' | 'apartment';
  guest_space: 'entire_place' | 'room' | 'shared_room';
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
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
  const [formData, setFormData] = useState<FormData>({
    property_type: 'apartment',
    guest_space: 'entire_place',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'USA',
    max_occupancy: 1,
    bedrooms: 1,
    bathrooms: 1,
    occupants: [],
    amenities: [],
    photos: [],
    title: '',
    description: '',
    price_per_night: 0,
    start_date: '',
    end_date: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const amenities = [
    { code: 'wifi', name: 'Wi-Fi', category: 'core' },
    { code: 'tv', name: 'TV', category: 'core' },
    { code: 'kitchen', name: 'Kitchen', category: 'core' },
    { code: 'washer', name: 'Washer', category: 'core' },
    { code: 'free_parking', name: 'Free parking on premises', category: 'core' },
    { code: 'paid_parking', name: 'Paid parking on premises', category: 'core' },
    { code: 'aircon', name: 'Air conditioning', category: 'core' },
    { code: 'workspace', name: 'Dedicated workspace', category: 'core' },
    { code: 'pool', name: 'Pool', category: 'extra' },
    { code: 'hot_tub', name: 'Hot tub', category: 'extra' },
    { code: 'patio', name: 'Patio', category: 'extra' },
    { code: 'bbq', name: 'BBQ grill', category: 'extra' },
    { code: 'outdoor_dining', name: 'Outdoor dining area', category: 'extra' },
    { code: 'fire_pit', name: 'Fire pit', category: 'extra' },
    { code: 'pool_table', name: 'Pool table', category: 'extra' },
    { code: 'indoor_fireplace', name: 'Indoor fireplace', category: 'extra' },
    { code: 'piano', name: 'Piano', category: 'extra' },
    { code: 'gym', name: 'Exercise equipment', category: 'extra' },
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
    setFormData(prev => ({ ...prev, photos: files }));
    // Reset the input value to allow re-uploading the same file
    e.target.value = '';
  };

  const nextStep = () => {
    if (currentStep < 13) {
      setCurrentStep(currentStep + 1);
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
    if (!user || !profile) {
      alert('Please log in to create a listing');
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
      submitData.append('city', formData.city);
      submitData.append('state', formData.state);
      submitData.append('zip', formData.zip);
      submitData.append('country', formData.country);
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

      const response = await fetch('http://localhost:4000/api/listings', {
        method: 'POST',
        body: submitData
      });

      if (response.ok) {
        const result = await response.json();
        alert('Listing created successfully!');
        router.push(`/listings/${result.id}`);
      } else {
        const error = await response.json();
        alert(`Error creating listing: ${error.error}`);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Error creating listing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-black">Which of these best describes your place?</h2>
            <div className="space-y-4">
              {[
                { value: 'house', label: 'House' },
                { value: 'apartment', label: 'Apartment' }
              ].map(option => (
                <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="property_type"
                    value={option.value}
                    checked={formData.property_type === option.value}
                    onChange={(e) => handleInputChange('property_type', e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-lg text-black">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-black">What type of place will guests have?</h2>
            <div className="space-y-4">
              {[
                { value: 'entire_place', label: 'An entire place' },
                { value: 'room', label: 'A room' },
                { value: 'shared_room', label: 'A shared room' }
              ].map(option => (
                <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="guest_space"
                    value={option.value}
                    checked={formData.guest_space === option.value}
                    onChange={(e) => handleInputChange('guest_space', e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-lg text-black">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-black">Where's your place located?</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-black">Country/region</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg text-black"
                  placeholder="USA"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-black">Street address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg text-black"
                  placeholder="123 Main St"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-black">Apt, unit, suite (if applicable)</label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg text-black"
                  placeholder="Apt 3B"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-black">City/town</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg text-black"
                  placeholder="Boston"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-black">State/territory</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg text-black"
                  placeholder="MA"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-black">Zip code</label>
                <input
                  type="text"
                  value={formData.zip}
                  onChange={(e) => handleInputChange('zip', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg text-black"
                  placeholder="02115"
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-black">How many people can stay here?</h2>
            <input
              type="number"
              min="1"
              value={formData.max_occupancy}
              onChange={(e) => handleInputChange('max_occupancy', parseInt(e.target.value))}
              className="w-full p-3 border border-gray-300 rounded-lg text-center text-2xl text-black"
            />
          </div>
        );

      case 5:
        return (
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-black">How many bedrooms?</h2>
            <input
              type="number"
              min="0"
              value={formData.bedrooms}
              onChange={(e) => handleInputChange('bedrooms', parseInt(e.target.value))}
              className="w-full p-3 border border-gray-300 rounded-lg text-center text-2xl text-black"
            />
          </div>
        );

      case 6:
        return (
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-black">How many bathrooms?</h2>
            <input
              type="number"
              min="1"
              step="0.5"
              value={formData.bathrooms}
              onChange={(e) => handleInputChange('bathrooms', parseFloat(e.target.value))}
              className="w-full p-3 border border-gray-300 rounded-lg text-center text-2xl text-black"
            />
          </div>
        );

      case 7:
        return (
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-black">Who else might be there?</h2>
            <div className="space-y-4">
              {occupants.map(occupant => (
                <label key={occupant.value} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.occupants.includes(occupant.value)}
                    onChange={() => handleOccupantToggle(occupant.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-lg text-black">{occupant.label}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 8:
        return (
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-black">Amenities</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {amenities.map(amenity => (
                <label key={amenity.code} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.amenities.includes(amenity.code)}
                    onChange={() => handleAmenityToggle(amenity.code)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-lg text-black">{amenity.name}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 9:
        return (
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-black">Upload Photos (at least 5)</h2>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handlePhotoUpload}
              className="w-full p-3 border border-gray-300 rounded-lg"
              key={`file-input-${currentStep}`}
            />
            {formData.photos.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-black mb-4">Selected {formData.photos.length} photos</p>
                <div className="grid grid-cols-2 gap-4">
                  {formData.photos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            photos: prev.photos.filter((_, i) => i !== index)
                          }));
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 10:
        return (
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-black">Write a title</h2>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-black"
              placeholder="Cozy apartment near campus"
              maxLength={120}
            />
          </div>
        );

      case 11:
        return (
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-black">Write a description</h2>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg h-32 resize-none text-black"
              placeholder="Describe your place..."
            />
          </div>
        );

      case 12:
        return (
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-black">Price per night</h2>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-500">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={Number.isFinite(formData.price_per_night) ? formData.price_per_night : ""}
                onChange={(e) => handleInputChange('price_per_night', parseFloat(e.target.value))}
                className="w-full p-3 pl-8 border border-gray-300 rounded-lg text-center text-2xl text-black"
                placeholder="0"
              />
            </div>
          </div>
        );

      case 13:
        return (
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-black">Availability dates</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-black">Start date</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleInputChange('start_date', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-black">End date</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => handleInputChange('end_date', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg text-black"
                />
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
    <div className="bg-white min-h-screen">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8 pt-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-center mb-4 text-black">Become a Sublettor</h1>
          <div className="flex justify-center mb-8">
            <div className="flex space-x-2">
              {Array.from({ length: 13 }, (_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${
                    i + 1 <= currentStep ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {renderStep()}

          <div className="flex justify-between mt-8">
            {currentStep > 1 && (
              <button
                onClick={prevStep}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-black"
              >
                Back
              </button>
            )}
            <div className="flex-1" />
            {currentStep < 13 ? (
              <button
                onClick={nextStep}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={submitting}
              >
                {submitting ? "Creating..." : "Create Listing"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
