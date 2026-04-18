/**
 * Calculate the great-circle distance between two GPS coordinates using the Haversine formula.
 * @returns Distance in meters.
 */
export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Get today's date string in IST (YYYY-MM-DD).
 */
export function todayIST(): string {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const now = new Date(Date.now() + istOffset);
  return now.toISOString().split('T')[0];
}

/**
 * Get yesterday's date string in IST (YYYY-MM-DD).
 */
export function yesterdayIST(): string {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const now = new Date(Date.now() + istOffset - 24 * 60 * 60 * 1000);
  return now.toISOString().split('T')[0];
}
