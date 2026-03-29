import { useState, useEffect } from 'react'

const FADE_MS = 2000

// localLaser: { x, y, color } | null  — the current user's own dot (always full opacity)
// remoteLasers: { [name]: { x, y, color, ts } }
export default function LaserPointer({ remoteLasers, localLaser, localName }) {
  // Re-render at ~10fps so opacity transitions are visible as dots age out
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick((t) => t + 1), 100)
    return () => clearInterval(id)
  }, [])

  const now = Date.now()

  return (
    <div style={styles.overlay}>
      {/* Local user's own dot */}
      {localLaser && (
        <div
          style={{
            ...styles.dot,
            left: `${localLaser.x}%`,
            top: `${localLaser.y}%`,
            background: localLaser.color,
            boxShadow: `0 0 10px 4px ${localLaser.color}99`,
            opacity: 1,
          }}
        >
          <span style={{ ...styles.label, borderColor: localLaser.color }}>You</span>
        </div>
      )}

      {/* Remote participants' dots */}
      {Object.entries(remoteLasers).map(([participantName, { x, y, color, ts }]) => {
        const age = now - ts
        if (age > FADE_MS) return null
        const opacity = Math.max(0, 1 - age / FADE_MS)
        return (
          <div
            key={participantName}
            style={{
              ...styles.dot,
              left: `${x}%`,
              top: `${y}%`,
              background: color,
              boxShadow: `0 0 10px 4px ${color}99`,
              opacity,
            }}
          >
            <span style={{ ...styles.label, borderColor: color }}>{participantName}</span>
          </div>
        )
      })}
    </div>
  )
}

const styles = {
  overlay: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 10,
    overflow: 'hidden',
  },
  dot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: '50%',
    transform: 'translate(-50%, -50%)',
  },
  label: {
    position: 'absolute',
    top: 14,
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: 10,
    fontWeight: 600,
    color: '#fff',
    whiteSpace: 'nowrap',
    background: 'rgba(0,0,0,0.55)',
    border: '1px solid transparent',
    padding: '1px 5px',
    borderRadius: 3,
    letterSpacing: '0.2px',
  },
}
