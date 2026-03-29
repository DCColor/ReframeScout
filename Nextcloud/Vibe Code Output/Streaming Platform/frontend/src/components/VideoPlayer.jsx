import { useState } from 'react'

const IFRAME_SRC =
  'https://customer-nm8nevs4vhwnkl65.cloudflarestream.com/9b3f95f153b184ca5c7919b299784a61/iframe?lowLatencyHLS=true'

export default function VideoPlayer() {
  const [streamActive, setStreamActive] = useState(false)

  return (
    <div style={styles.wrapper}>
      <div style={styles.aspectBox}>
        <iframe
          src={IFRAME_SRC}
          style={styles.iframe}
          allow="autoplay; fullscreen"
          allowFullScreen
          title="DC Color Live stream"
          onLoad={() => setStreamActive(true)}
        />

        {!streamActive && (
          <div style={styles.overlay}>
            <div style={styles.overlayInner}>
              <div style={styles.pulseRing} />
              <p style={styles.overlayText}>Waiting for stream…</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  wrapper: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#000',
  },
  aspectBox: {
    position: 'relative',
    width: '100%',
    maxHeight: '100%',
    aspectRatio: '16 / 9',
    background: '#000',
  },
  iframe: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    border: 'none',
    display: 'block',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#000',
    zIndex: 1,
  },
  overlayInner: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
  },
  pulseRing: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    border: '3px solid var(--accent)',
    opacity: 0.6,
    animation: 'pulse 2s ease-in-out infinite',
  },
  overlayText: {
    color: 'var(--text-muted)',
    fontSize: 14,
    letterSpacing: '0.5px',
  },
}
