// Utility to fetch commute times using Google Maps Directions API
// Usage: getCommuteTimes({lat, lng}, {lat, lng})

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
  // Call backend endpoint instead of Google directly
  const res = await fetch('http://localhost:4000/api/commute-times', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ origin, destination })
  });
  if (!res.ok) throw new Error('Failed to fetch commute times');
  return await res.json();
} 