const STORAGE_KEY = 'pintaiwan_streak'
const RESULTS_KEY = 'pintaiwan_results'
const START_DATE = '2025-01-01' // Day 1

/**
 * Get today's date string in Taiwan time (UTC+8)
 * @returns {string} Date in "YYYY-MM-DD" format
 */
function getTaiwanDateString() {
  const now = new Date()
  const taiwanOffset = 8 * 60 // minutes
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000
  const taiwanTime = new Date(utcTime + taiwanOffset * 60000)

  const year = taiwanTime.getFullYear()
  const month = String(taiwanTime.getMonth() + 1).padStart(2, '0')
  const day = String(taiwanTime.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * Get yesterday's date string in Taiwan time (UTC+8)
 * @returns {string} Date in "YYYY-MM-DD" format
 */
function getYesterdayTaiwanDateString() {
  const now = new Date()
  const taiwanOffset = 8 * 60
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000
  const taiwanTime = new Date(utcTime + taiwanOffset * 60000)
  taiwanTime.setDate(taiwanTime.getDate() - 1)

  const year = taiwanTime.getFullYear()
  const month = String(taiwanTime.getMonth() + 1).padStart(2, '0')
  const day = String(taiwanTime.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * Calculate day number since start date
 * @returns {number} Day number (1-indexed)
 */
export function getDayNumber() {
  const start = new Date(START_DATE)
  const today = getTaiwanDateString()
  const current = new Date(today)

  const diffTime = current.getTime() - start.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  return diffDays + 1 // 1-indexed
}

/**
 * Get streak data from localStorage
 * @returns {object} { streak: number, lastPlayedDate: string | null }
 */
function getStreakData() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      return JSON.parse(data)
    }
  } catch (e) {
    console.error('Failed to read streak data:', e)
  }
  return { streak: 0, lastPlayedDate: null }
}

/**
 * Save streak data to localStorage
 * @param {object} data - { streak: number, lastPlayedDate: string }
 */
function saveStreakData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('Failed to save streak data:', e)
  }
}

/**
 * Get current streak count
 * @returns {number} Current streak (0 if no history or streak broken)
 */
export function getStreak() {
  const { streak, lastPlayedDate } = getStreakData()

  if (!lastPlayedDate) {
    return 0
  }

  const today = getTaiwanDateString()
  const yesterday = getYesterdayTaiwanDateString()

  // If played today, streak is valid
  if (lastPlayedDate === today) {
    return streak
  }

  // If played yesterday, streak is still valid (waiting for today's play)
  if (lastPlayedDate === yesterday) {
    return streak
  }

  // Streak is broken
  return 0
}

/**
 * Check if user has already played today
 * @returns {boolean}
 */
export function hasPlayedToday() {
  const { lastPlayedDate } = getStreakData()
  return lastPlayedDate === getTaiwanDateString()
}

/**
 * Get today's saved results if available
 * @returns {object|null} { score, pin, submittedSeconds } or null
 */
export function getTodayResults() {
  try {
    const data = localStorage.getItem(RESULTS_KEY)
    if (data) {
      const results = JSON.parse(data)
      if (results.date === getTaiwanDateString()) {
        return results
      }
    }
  } catch (e) {
    console.error('Failed to read results data:', e)
  }
  return null
}

/**
 * Save today's results to localStorage
 * @param {object} results - { score, pin, submittedSeconds }
 */
export function saveResults(results) {
  try {
    localStorage.setItem(RESULTS_KEY, JSON.stringify({
      ...results,
      date: getTaiwanDateString()
    }))
  } catch (e) {
    console.error('Failed to save results:', e)
  }
}

/**
 * Record today's play and update streak
 * Call this when a round is completed
 * @returns {number} New streak count
 */
export function recordPlay() {
  const { streak, lastPlayedDate } = getStreakData()
  const today = getTaiwanDateString()
  const yesterday = getYesterdayTaiwanDateString()

  // Already played today, no update needed
  if (lastPlayedDate === today) {
    return streak
  }

  let newStreak

  if (lastPlayedDate === yesterday) {
    // Continuing streak
    newStreak = streak + 1
  } else {
    // Starting new streak
    newStreak = 1
  }

  saveStreakData({
    streak: newStreak,
    lastPlayedDate: today
  })

  return newStreak
}

/**
 * Get milliseconds until next Taiwan midnight (UTC+8)
 * @returns {number} Milliseconds until midnight
 */
export function getTimeUntilMidnight() {
  const now = new Date()
  const taiwanOffset = 8 * 60 // minutes
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000
  const taiwanTime = new Date(utcTime + taiwanOffset * 60000)

  // Get next midnight in Taiwan time
  const nextMidnight = new Date(taiwanTime)
  nextMidnight.setDate(nextMidnight.getDate() + 1)
  nextMidnight.setHours(0, 0, 0, 0)

  // Convert back to local time for calculation
  const nextMidnightUTC = nextMidnight.getTime() - taiwanOffset * 60000
  const nowUTC = now.getTime() + now.getTimezoneOffset() * 60000

  return nextMidnightUTC - nowUTC
}

/**
 * Format milliseconds as HH:MM:SS
 * @param {number} ms - Milliseconds
 * @returns {string} Formatted time string
 */
export function formatCountdown(ms) {
  if (ms <= 0) return '00:00:00'

  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0')
  ].join(':')
}
