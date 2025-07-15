"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { useAuth } from '../../../hooks/useAuth';
import GoogleMapsAutocomplete from '../../../components/GoogleMapsAutocomplete';
import MapPreview from '../../../components/MapPreview';

interface ListingImage {
  url: string;
  order_index?: number;
}

interface Listing {
  id: string;
  user_id: string;
  title: string;
  description: string;
  address: string;
  unit?: string;
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
  images: ListingImage[];
  property_type?: string;
  guest_space?: string;
  price_per_night: number;
  start_date: string;
  end_date: string;
}

export default function EditListing() {
  const { id } = useParams();
  const router = useRouter();
  const { user, profile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [listing, setListing] = useState<Listing | null>(null);
  const [formData, setFormData] = useState<Partial<Listing>>({});
  const [photoReplacements, setPhotoReplacements] = useState<{ [key: number]: File }>({});
  const [photoPreviews, setPhotoPreviews] = useState<{ [key: number]: string }>({});

  // Load existing listing data
  useEffect(() => {
    // Cleanup preview URLs when component unmounts
    return () => {
      Object.values(photoPreviews).forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [photoPreviews]);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const response = await fetch(`http://localhost:4000/api/listings/${id}`);
        if (response.ok) {
          const listingData = await response.json();
          setListing(listingData);
          setFormData({
            property_type: listingData.property_type || 'apartment',
            guest_space: listingData.guest_space || 'entire_place',
            address: listingData.address || '',
            unit: listingData.unit || '',
            city: listingData.city || '',
            state: listingData.state || '',
            zip: listingData.zip || '',
            country: listingData.country || 'USA',
            neighborhood: listingData.neighborhood || '',
            latitude: listingData.latitude,
            longitude: listingData.longitude,
            max_occupancy: listingData.max_occupancy || 1,
            bedrooms: listingData.bedrooms || 1,
            bathrooms: listingData.bathrooms || 1,
            occupants: listingData.occupants || [],
            amenities: listingData.amenities?.map((a: any) => a.code || a) || [],
            title: listingData.title || '',
            description: listingData.description || '',
            price_per_night: listingData.price_per_night || 0,
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

  const handleInputChange = (field: keyof Listing, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAmenityToggle = (amenityCode: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities?.includes(amenityCode)
        ? prev.amenities.filter(a => a !== amenityCode)
        : [...(prev.amenities || []), amenityCode]
    }));
  };

  const handleOccupantToggle = (occupant: string) => {
    setFormData(prev => ({
      ...prev,
      occupants: prev.occupants?.includes(occupant)
        ? prev.occupants.filter(o => o !== occupant)
        : [...(prev.occupants || []), occupant]
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

  const handlePhotoReplacement = (index: number, file: File | null) => {
    if (file) {
      setPhotoReplacements(prev => ({ ...prev, [index]: file }));
      // Create preview URL for the new image
      const previewUrl = URL.createObjectURL(file);
      setPhotoPreviews(prev => ({ ...prev, [index]: previewUrl }));
    } else {
      setPhotoReplacements(prev => {
        const newReplacements = { ...prev };
        delete newReplacements[index];
        return newReplacements;
      });
      // Remove preview URL and cleanup blob
      setPhotoPreviews(prev => {
        const newPreviews = { ...prev };
        if (newPreviews[index]) {
          URL.revokeObjectURL(newPreviews[index]);
          delete newPreviews[index];
        }
        return newPreviews;
      });
    }
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

    try {
      // Create FormData for multipart/form-data if there are photo replacements
      const hasPhotoReplacements = Object.keys(photoReplacements).length > 0;
      
      let response;
      if (hasPhotoReplacements) {
        const formDataToSend = new FormData();
        
        // Add all the listing data
        formDataToSend.append('title', formData.title || '');
        formDataToSend.append('description', formData.description || '');
        formDataToSend.append('address', formData.address || '');
        formDataToSend.append('unit', formData.unit || '');
        formDataToSend.append('city', formData.city || '');
        formDataToSend.append('state', formData.state || '');
        formDataToSend.append('zip', formData.zip || '');
        formDataToSend.append('country', formData.country || '');
        formDataToSend.append('neighborhood', formData.neighborhood || '');
        formDataToSend.append('latitude', formData.latitude?.toString() || '');
        formDataToSend.append('longitude', formData.longitude?.toString() || '');
        formDataToSend.append('price_per_night', formData.price_per_night?.toString() || '');
        formDataToSend.append('start_date', formData.start_date || '');
        formDataToSend.append('end_date', formData.end_date || '');
        formDataToSend.append('max_occupancy', formData.max_occupancy?.toString() || '');
        formDataToSend.append('property_type', formData.property_type || '');
        formDataToSend.append('guest_space', formData.guest_space || '');
        formDataToSend.append('bedrooms', formData.bedrooms?.toString() || '');
        formDataToSend.append('bathrooms', formData.bathrooms?.toString() || '');
        formDataToSend.append('amenities', JSON.stringify(formData.amenities || []));
        formDataToSend.append('occupants', JSON.stringify(formData.occupants || []));
        
        // Add photo replacements
        Object.entries(photoReplacements).forEach(([index, file]) => {
          formDataToSend.append('photo_replacements', file);
          formDataToSend.append('photo_indices', index);
        });
        
        response = await fetch(`http://localhost:4000/api/listings/${id}`, {
          method: 'PUT',
          body: formDataToSend
        });
      } else {
        // Regular JSON update without photos
        response = await fetch(`http://localhost:4000/api/listings/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
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
            occupants: formData.occupants
          })
        });
      }

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

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-16">
        <Navbar />
        <div className="max-w-md mx-auto mt-16 text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-white pt-16">
        <Navbar />
        <div className="max-w-md mx-auto mt-16 text-center text-red-500">Listing not found.</div>
      </div>
    );
  }

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
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-black">Where's your place located?</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Address Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-black">Search for your address</label>
                  <GoogleMapsAutocomplete
                    onAddressSelect={handleAddressSelect}
                    placeholder="Start typing your address..."
                  />
                  <p className="text-sm text-gray-600 mt-1">Type your address and select from the suggestions</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-black">Street address</label>
                    <input
                      type="text"
                      value={formData.address || ''}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg text-black"
                      placeholder="123 Main St"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-black">Apt, unit, suite</label>
                    <input
                      type="text"
                      value={formData.unit || ''}
                      onChange={(e) => handleInputChange('unit', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg text-black"
                      placeholder="Apt 3B"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-black">Neighborhood</label>
                    <input
                      type="text"
                      value={formData.neighborhood || ''}
                      onChange={(e) => handleInputChange('neighborhood', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg text-black"
                      placeholder="Allston"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-black">City</label>
                    <input
                      type="text"
                      value={formData.city || ''}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg text-black"
                      placeholder="Boston"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-black">State</label>
                    <input
                      type="text"
                      value={formData.state || ''}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg text-black"
                      placeholder="MA"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-black">Zip code</label>
                    <input
                      type="text"
                      value={formData.zip || ''}
                      onChange={(e) => handleInputChange('zip', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg text-black"
                      placeholder="02115"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-black">Country</label>
                  <input
                    type="text"
                    value={formData.country || ''}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg text-black"
                    placeholder="USA"
                  />
                </div>
              </div>

              {/* Right Column - Map Preview */}
              <div>
                <label className="block text-sm font-medium mb-2 text-black">Map Preview</label>
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
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-black">How many people can stay here?</h2>
            <input
              type="number"
              min="1"
              value={formData.max_occupancy || 1}
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
              value={formData.bedrooms || 1}
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
              value={formData.bathrooms || 1}
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
                    checked={formData.occupants?.includes(occupant.value) || false}
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
                    checked={formData.amenities?.includes(amenity.code) || false}
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
            <h2 className="text-2xl font-bold mb-6 text-black">Edit Photos</h2>
            <div className="space-y-4">
                                          {listing.images && listing.images.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {listing.images.map((image, index) => {
                    const imageUrl = image.url.startsWith('/uploads/') ? `http://localhost:4000${image.url}` : image.url;
                    console.log(`Rendering image ${index}:`, imageUrl);
                    return (
                      <div key={index} className="relative group">
                        <img
                          src={photoPreviews[index] || imageUrl}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-gray-300"
                          onError={(e) => {
                            console.error('Failed to load image:', photoPreviews[index] || imageUrl);
                            // If preview fails, fallback to original image
                            if (photoPreviews[index]) {
                              e.currentTarget.src = imageUrl;
                              // Clean up the invalid preview
                              setPhotoPreviews(prev => {
                                const newPreviews = { ...prev };
                                if (newPreviews[index]) {
                                  URL.revokeObjectURL(newPreviews[index]);
                                  delete newPreviews[index];
                                }
                                return newPreviews;
                              });
                            } else {
                              e.currentTarget.style.display = 'none';
                            }
                          }}
                          onLoad={() => console.log(`Successfully loaded image ${index}:`, photoPreviews[index] || imageUrl)}
                        />
                        
                        {/* Simple replace button below image */}
                        <div className="mt-2 text-center">
                          <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium">
                            {photoReplacements[index] ? 'Photo Selected' : 'Replace Photo'}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handlePhotoReplacement(index, e.target.files?.[0] || null)}
                              className="hidden"
                            />
                          </label>
                          {photoReplacements[index] && (
                            <div className="text-xs text-green-600 font-medium mt-1">
                              {photoReplacements[index].name}
                            </div>
                          )}
                        </div>
                      </div>
                  );
                })}
              </div>
              ) : (
                <p className="text-gray-500 text-center">No photos uploaded</p>
              )}
              
              {/* Summary of changes */}
              {Object.keys(photoReplacements).length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800 font-medium">
                    {Object.keys(photoReplacements).length} photo(s) will be replaced
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Only the selected photos will be updated. Others will remain unchanged.
                  </p>
                </div>
              )}
              
              <p className="text-sm text-gray-600">
                Hover over photos to replace them. Only selected photos will be updated.
              </p>
            </div>
          </div>
        );

      case 10:
        return (
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-black">Write a title</h2>
            <input
              type="text"
              value={formData.title || ''}
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
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-black"
              placeholder="Describe your place..."
              rows={6}
            />
          </div>
        );

      case 12:
        return (
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-black">Set your price per night</h2>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.price_per_night || 0}
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
            <h2 className="text-2xl font-bold mb-6 text-black">Set availability dates</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-black">Start date</label>
                <input
                  type="date"
                  value={formData.start_date || ''}
                  onChange={(e) => handleInputChange('start_date', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-black">End date</label>
                <input
                  type="date"
                  value={formData.end_date || ''}
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

  return (
    <div className="min-h-screen bg-white pt-16">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-8 mt-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">Edit Listing</h1>
          <p className="text-gray-600">Step {currentStep} of 13</p>
        </div>
        
        {renderStep()}
        
        <div className="flex justify-between mt-8">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className={`px-6 py-2 rounded-lg font-semibold ${
              currentStep === 1
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gray-600 hover:bg-gray-700 text-white'
            }`}
          >
            Back
          </button>
          
          {currentStep === 13 ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className={`px-6 py-2 rounded-lg font-semibold ${
                submitting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {submitting ? 'Updating...' : 'Update Listing'}
            </button>
          ) : (
            <button
              onClick={nextStep}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 