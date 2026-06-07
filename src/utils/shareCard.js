/**
 * Get emoji indicator based on score value and type
 * @param {number|null} value - The value to convert
 * @param {string} type - "time" | "distance" | "score"
 * @returns {string} Emoji indicator
 */
export function getScoreEmoji(value, type) {
  if (value === null) return '⬜'

  switch (type) {
    case 'time': // seconds elapsed
      if (value <= 6) return '🟩'
      if (value <= 12) return '🟨'
      if (value <= 20) return '🟧'
      if (value <= 28) return '🟥'
      return '⬜'

    case 'distance': // miles
      if (value <= 40) return '🟩'
      if (value <= 80) return '🟨'
      if (value <= 120) return '🟧'
      if (value <= 160) return '🟥'
      return '⬜'

    case 'score': // out of 1000
      if (value >= 800) return '🟩'
      if (value >= 600) return '🟨'
      if (value >= 400) return '🟧'
      if (value >= 200) return '🟥'
      return '⬜'

    default:
      return '⬜'
  }
}

/**
 * Build share text for results
 * @param {object} params
 * @param {number} params.dayNumber - Day number since start
 * @param {number} params.timeElapsed - Seconds elapsed (30 - remainingSeconds)
 * @param {number|null} params.distanceMiles - Distance in miles (null if no guess)
 * @param {number} params.totalScore - Total score out of 1000
 * @returns {string} Formatted share text
 */
export function buildShareText({ dayNumber, timeElapsed, distanceMiles, totalScore }) {
  const timeEmoji = getScoreEmoji(timeElapsed, 'time')
  const distanceEmoji = getScoreEmoji(distanceMiles, 'distance')
  const scoreEmoji = getScoreEmoji(totalScore, 'score')

  const distanceText = distanceMiles !== null
    ? `${distanceMiles} miles`
    : 'no guess'

  const lines = [
    `PinTaiwan #${dayNumber}`,
    `⏱️ ${timeEmoji}  ${timeElapsed}s`,
    `📍 ${distanceEmoji}  ${distanceText}`,
    `✨ ${scoreEmoji}  ${totalScore} / 1000`,
    '',
    'https://pintaiwan.vercel.app'
  ]

  return lines.join('\n')
}

/**
 * Copy text to clipboard with fallback
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }

    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()

    const success = document.execCommand('copy')
    document.body.removeChild(textArea)
    return success
  } catch (err) {
    console.error('Failed to copy:', err)
    return false
  }
}
