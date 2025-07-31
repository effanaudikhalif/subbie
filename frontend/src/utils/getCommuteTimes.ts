// Utility to fetch commute times using Google Maps Directions API
// Usage: getCommuteTimes({lat, lng}, {lat, lng})

import { buildApiUrl } from './api';

export interface CommuteTimes {
  car: string | null;
  transit: string | null;
  bike: string | null;
  walk: string | null;
}

export async function getCommuteTimes(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<CommuteTimes> {
  console.log('getCommuteTimes called with:', { origin, destination });
  
  // Call backend endpoint instead of Google directly
  const url = buildApiUrl('/api/commute-times');
  console.log('Making request to:', url);
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ origin, destination })
  });
  
  console.log('Response status:', res.status);
  console.log('Response ok:', res.ok);
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error('Response error:', errorText);
    throw new Error('Failed to fetch commute times');
  }
  
  const result = await res.json();
  console.log('Commute times result:', result);
  return result;
} 