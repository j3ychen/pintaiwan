import { useState, useEffect, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, GeoJSON, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { getDailyTown } from './utils/dailyTown'
import taiwanBoundary from './data/taiwanBoundary.json'
import { calculateScore } from './utils/scoring'
import {
  getStreak,
  getDayNumber,
  recordPlay,
  hasPlayedToday,
  getTodayResults,
  saveResults,
  getTimeUntilMidnight,
  formatCountdown
} from './utils/streak'
import { buildShareText, copyToClipboard } from './utils/shareCard'
import './App.css'

const TIMER_DURATION = 30

// Custom marker icons
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

// Default icon fix for regular markers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

function MapClickHandler({ onMapClick, disabled }) {
  useMapEvents({
    click: (e) => {
      if (!disabled) {
        onMapClick(e.latlng)
      }
    },
  })
  return null
}

function FitBounds({ bounds }) {
  const map = useMap()
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [map, bounds])
  return null
}

// Taiwan overlay component - grey mask outside Taiwan + border outline
function TaiwanOverlay() {
  const maskStyle = {
    fillColor: '#888888',
    fillOpacity: 0.5,
    stroke: false
  }

  const outlineStyle = {
    color: '#555555',
    weight: 1,
    opacity: 0.6,
    fill: false
  }

  return (
    <>
      <GeoJSON data={taiwanBoundary.mask} style={maskStyle} />
      <GeoJSON data={taiwanBoundary.outline} style={outlineStyle} />
    </>
  )
}

function getTimerColor(seconds) {
  if (seconds >= 15) return '#22c55e' // green
  if (seconds >= 8) return '#f59e0b'  // amber
  return '#ef4444'                     // red
}

function App() {
  // Check if already played today on mount
  const alreadyPlayed = hasPlayedToday()
  const savedResults = alreadyPlayed ? getTodayResults() : null

  const [gameState, setGameState] = useState(alreadyPlayed ? 'results' : 'landing')
  const [pin, setPin] = useState(savedResults?.pin || null)
  const [timeRemaining, setTimeRemaining] = useState(TIMER_DURATION)
  const [score, setScore] = useState(savedResults?.score || null)
  const [submittedSeconds, setSubmittedSeconds] = useState(savedResults?.submittedSeconds ?? 0)
  const [streak, setStreak] = useState(getStreak())
  const [countdown, setCountdown] = useState(formatCountdown(getTimeUntilMidnight()))
  const [shareButtonText, setShareButtonText] = useState('Share Result')
  const [showShareFallback, setShowShareFallback] = useState(false)

  const dailyTown = getDailyTown()
  const dayNumber = getDayNumber()

  // Use ref to access current values in callbacks without stale closure
  const pinRef = useRef(pin)
  const timeRef = useRef(timeRemaining)
  pinRef.current = pin
  timeRef.current = timeRemaining

  const handleSubmit = useCallback((secondsRemaining) => {
    if (gameState === 'results') return
    setGameState('results')
    setSubmittedSeconds(secondsRemaining)

    const currentPin = pinRef.current
    const result = calculateScore(
      currentPin?.lat ?? null,
      currentPin?.lng ?? null,
      dailyTown.lat,
      dailyTown.lng,
      secondsRemaining
    )
    setScore(result)

    // Save results to localStorage
    saveResults({
      score: result,
      pin: currentPin,
      submittedSeconds: secondsRemaining
    })

    // Record play and update streak
    const newStreak = recordPlay()
    setStreak(newStreak)
  }, [gameState, dailyTown.lat, dailyTown.lng])

  const handleConfirmClick = () => {
    handleSubmit(timeRef.current)
  }

  const handleStartGame = () => {
    setGameState('playing')
  }

  // Timer countdown - only runs when playing
  useEffect(() => {
    if (gameState !== 'playing') return

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [gameState])

  // Auto-submit when timer reaches 0
  useEffect(() => {
    if (timeRemaining === 0 && gameState === 'playing') {
      handleSubmit(0)
    }
  }, [timeRemaining, gameState, handleSubmit])

  // Countdown to midnight - updates every second in results view
  useEffect(() => {
    if (gameState !== 'results') return

    const interval = setInterval(() => {
      setCountdown(formatCountdown(getTimeUntilMidnight()))
    }, 1000)

    return () => clearInterval(interval)
  }, [gameState])

  const handleMapClick = (latlng) => {
    setPin(latlng)
  }

  const handleShare = async () => {
    const timeTaken = TIMER_DURATION - submittedSeconds
    const shareText = buildShareText({
      dayNumber,
      timeElapsed: timeTaken,
      distanceMiles: score?.distanceMiles ?? null,
      totalScore: score?.total ?? 0
    })

    const success = await copyToClipboard(shareText)

    if (success) {
      setShareButtonText('Copied!')
      setTimeout(() => {
        setShareButtonText('Share Result')
      }, 2000)
    } else {
      // Show fallback textarea
      setShowShareFallback(true)
    }
  }

  const timerProgress = (timeRemaining / TIMER_DURATION) * 100
  const timerColor = getTimerColor(timeRemaining)

  // Landing page
  if (gameState === 'landing') {
    return (
      <div className="app landing-page">
        <div className="landing-content">
          <h1 className="landing-title">PinTaiwan</h1>
          <p className="landing-tagline">Every town tells a story.</p>

          <div className="landing-divider"></div>

          <p className="daily-number">Daily #{dayNumber}</p>

          <button className="play-button" onClick={handleStartGame}>
            Play today's town
          </button>

          <p className="streak-text">
            {streak > 1 ? `${streak} day streak` : streak === 1 ? '1 day streak' : 'First play!'}
          </p>
        </div>
      </div>
    )
  }

  // Results view
  if (gameState === 'results' && score) {
    const actualLocation = [dailyTown.lat, dailyTown.lng]
    const guessLocation = pin ? [pin.lat, pin.lng] : null

    // Calculate bounds to fit both markers
    const bounds = guessLocation
      ? L.latLngBounds([actualLocation, guessLocation])
      : L.latLngBounds([actualLocation, actualLocation])

    const timeTaken = TIMER_DURATION - submittedSeconds

    return (
      <div className="app results-view">
        <div className="results-header">
          <div className="town-pill">
            {dailyTown.nameRomanized}
          </div>
        </div>

        <div className="results-map-container">
          <MapContainer
            center={actualLocation}
            zoom={7}
            className="results-map"
            zoomControl={false}
            dragging={false}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png"
            />
            <TaiwanOverlay />
            <FitBounds bounds={bounds} />

            {/* Blue pin = actual location */}
            <Marker position={actualLocation} icon={blueIcon} />

            {/* Red pin = player's guess (only if they placed one) */}
            {guessLocation && (
              <>
                <Marker position={guessLocation} icon={redIcon} />
                <Polyline
                  positions={[guessLocation, actualLocation]}
                  pathOptions={{
                    color: '#666',
                    weight: 2,
                    dashArray: '8, 8'
                  }}
                />
              </>
            )}
          </MapContainer>
        </div>

        <div className="score-panel">
          <div className="score-row">
            <span className="score-label">Distance</span>
            <span className="score-value">
              {score.distanceMiles !== null
                ? `${score.distanceMiles} miles off`
                : 'No guess placed'}
            </span>
          </div>
          <div className="score-row">
            <span className="score-label">Time</span>
            <span className="score-value">{timeTaken}s</span>
          </div>
          <div className="score-row total">
            <span className="score-label">Score</span>
            <span className="score-value score-highlight">{score.total} / 1000</span>
          </div>
        </div>

        <div className="town-summary">
          <div className="town-summary-header">
            <span className="star-icon">★</span>
            <span>About {dailyTown.nameRomanized}</span>
          </div>
          <p className="town-summary-text">{dailyTown.summary}</p>
        </div>

        <div className="next-town">
          <p className="next-town-label">Next town in</p>
          <p className="next-town-countdown">{countdown}</p>
        </div>

        <button
          className={`share-button ${shareButtonText === 'Copied!' ? 'copied' : ''}`}
          onClick={handleShare}
        >
          {shareButtonText}
        </button>

        {showShareFallback && (
          <div className="share-fallback">
            <p className="share-fallback-label">Copy the text below:</p>
            <textarea
              className="share-fallback-textarea"
              readOnly
              value={buildShareText({
                dayNumber,
                timeElapsed: TIMER_DURATION - submittedSeconds,
                distanceMiles: score?.distanceMiles ?? null,
                totalScore: score?.total ?? 0
              })}
              onClick={(e) => e.target.select()}
            />
            <button
              className="share-fallback-close"
              onClick={() => setShowShareFallback(false)}
            >
              Close
            </button>
          </div>
        )}
      </div>
    )
  }

  // Playing view (guessing)
  return (
    <div className="app">
      <div className="header">
        <div className="town-pill">
          {dailyTown.nameRomanized}
        </div>
      </div>

      <div className="timer-bar-container">
        <div
          className="timer-bar"
          style={{
            width: `${timerProgress}%`,
            backgroundColor: timerColor
          }}
        />
        <span className="timer-text" style={{ color: timerColor }}>
          {timeRemaining}s
        </span>
      </div>

      <MapContainer
        center={[23.5, 121]}
        zoom={7}
        className="map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png"
        />
        <TaiwanOverlay />
        <MapClickHandler onMapClick={handleMapClick} disabled={gameState !== 'playing'} />
        {pin && <Marker position={[pin.lat, pin.lng]} icon={redIcon} />}
      </MapContainer>

      {pin && (
        <button className="confirm-button" onClick={handleConfirmClick}>
          Confirm guess
        </button>
      )}

      {pin && (
        <div className="debug-overlay">
          <strong>Pin Location</strong>
          <div>Lat: {pin.lat.toFixed(6)}</div>
          <div>Lng: {pin.lng.toFixed(6)}</div>
        </div>
      )}
    </div>
  )
}

export default App
