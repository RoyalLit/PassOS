/**
 * Validate if a point is within the campus boundary (circle geofence)
 */
export function isWithinCampus(
  lat: number, 
  lng: number,
  centerLat?: number,
  centerLng?: number,
  radiusMeters?: number
): boolean {
  const cLat = centerLat ?? parseFloat(process.env.NEXT_PUBLIC_CAMPUS_CENTER_LAT || '28.6139');
  const cLng = centerLng ?? parseFloat(process.env.NEXT_PUBLIC_CAMPUS_CENTER_LNG || '77.2090');
  const rad = radiusMeters ?? parseFloat(process.env.NEXT_PUBLIC_CAMPUS_RADIUS_METERS || '500');

  const distance = haversineDistance(lat, lng, cLat, cLng);
  return distance <= rad;
}

/**
 * Haversine formula to calculate distance between two points in meters
 */
function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
