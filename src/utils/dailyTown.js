import towns from '../data/towns.json'

/**
 * Get today's date string in Taiwan time (UTC+8)
 * @returns {string} Date in "YYYY-MM-DD" format
 */
function getTaiwanDateString() {
  const now = new Date()
  // Taiwan is UTC+8
  const taiwanOffset = 8 * 60 // minutes
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000
  const taiwanTime = new Date(utcTime + taiwanOffset * 60000)

  const year = taiwanTime.getFullYear()
  const month = String(taiwanTime.getMonth() + 1).padStart(2, '0')
  const day = String(taiwanTime.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * Simple hash function for a date string
 * @param {string} str - Date string to hash
 * @returns {number} Hash value
 */
function hashDateString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * Get the daily town based on Taiwan's current date
 * Returns the same town for everyone on the same Taiwan calendar date
 * @returns {object} Town object from towns.json
 */
export function getDailyTown() {
  const dateString = getTaiwanDateString()
  const hash = hashDateString(dateString)
  const index = hash % towns.length
  return towns[index]
}

/**
 * Get the Taiwan date string (useful for debugging)
 * @returns {string} Current Taiwan date in "YYYY-MM-DD" format
 */
export function getTaiwanDate() {
  return getTaiwanDateString()
}
