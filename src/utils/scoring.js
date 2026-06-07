const KM_PER_MILE = 1.60934
const MAX_DISTANCE_MILES = 200
const MAX_DISTANCE_KM = MAX_DISTANCE_MILES * KM_PER_MILE // ~322 km
const MAX_DISTANCE_SCORE = 700  // Distance weighted more heavily (70%)
const MAX_TIME_BONUS = 300      // Time bonus (30%)
const TIMER_DURATION = 30

/**
 * Calculate distance between two lat/lng points using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lng1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lng2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
export function calculateDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371 // Earth's radius in kilometers

  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180)
}

/**
 * Calculate score based on guess accuracy and remaining time
 * @param {number|null} guessLat - Latitude of guess (null if no pin placed)
 * @param {number|null} guessLng - Longitude of guess (null if no pin placed)
 * @param {number} actualLat - Latitude of actual location
 * @param {number} actualLng - Longitude of actual location
 * @param {number} remainingSeconds - Seconds remaining when submitted
 * @returns {object} Score breakdown { distanceScore, timeBonus, total, distanceMiles }
 */
export function calculateScore(guessLat, guessLng, actualLat, actualLng, remainingSeconds) {
  // No pin placed - return zero scores
  if (guessLat === null || guessLng === null) {
    return {
      distanceScore: 0,
      timeBonus: 0,
      total: 0,
      distanceMiles: null
    }
  }

  // Calculate distance
  const distanceKm = calculateDistanceKm(guessLat, guessLng, actualLat, actualLng)
  const distanceMiles = distanceKm / KM_PER_MILE

  // Distance score: max(0, round(700 × (1 - distanceKm / 322)))
  const distanceScore = Math.max(
    0,
    Math.round(MAX_DISTANCE_SCORE * (1 - distanceKm / MAX_DISTANCE_KM))
  )

  // Time bonus: round((remainingSeconds / 30) × 300)
  const timeBonus = Math.round((remainingSeconds / TIMER_DURATION) * MAX_TIME_BONUS)

  // Total score
  const total = distanceScore + timeBonus

  return {
    distanceScore,
    timeBonus,
    total,
    distanceMiles: Math.round(distanceMiles * 10) / 10 // Round to 1 decimal
  }
}
