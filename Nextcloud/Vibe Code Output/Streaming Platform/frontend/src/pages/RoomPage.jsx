import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Chat from '../components/Chat'
import VideoPlayer from '../components/VideoPlayer'
import VideoConference from '../components/VideoConference'

function formatElapsed(totalSeconds) {
  const hh = String(Math.floor(totalSeconds / 3600)).padStart(2, '0')
  const mm = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
  const ss = String(totalSeconds % 60).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

export default function RoomPage() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const name = sessionStorage.getItem('dcc_name') || 'Guest'
  const role = sessionStorage.getItem('dcc_role') || 'guest'
  const [timecode, setTimecode] = useState('00:00:00')

  useEffect(() => {
    let elapsed = 0
    const interval = setInterval(() => {
      elapsed += 1
      setTimecode(formatElapsed(elapsed))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={styles.layout}>
      {/* Top bar */}
      <header style={styles.header}>
        <div style={styles.brand}>
          <span style={{ color: 'var(--accent)', fontWeight: 700 }}>DC</span>
          <span style={{ color: 'var(--text-head)', fontWeight: 600 }}> Color Live</span>
        </div>

        <div style={styles.roomInfo}>
          <span style={styles.badge}>LIVE</span>
          <span style={styles.roomId} title={roomId}>
            Room: {roomId.slice(0, 8)}…
          </span>
        </div>

        {/* Live timecode display */}
        <div style={styles.timecodeWrapper}>
          <div style={styles.timecode}>{timecode}</div>
          <div style={styles.timecodeSubLabel}>Elapsed Session Time</div>
        </div>

        <button
          className="btn btn-ghost"
          style={styles.leaveBtn}
          onClick={() => navigate('/')}
        >
          Leave
        </button>
      </header>

      {/* Video conference overlay (bottom-left) */}
      <VideoConference participantName={name} role={role} roomId={roomId} />

      {/* Main content area */}
      <main style={styles.main}>
        <div style={styles.playerArea}>
          <VideoPlayer />
        </div>

        <aside style={styles.sidebar}>
          <Chat roomId={roomId} name={name} />
        </aside>
      </main>
    </div>
  )
}

const styles = {
  layout: {
    display: 'flex',
    flexDirection: 'column',
    height: '100svh',
    background: 'var(--bg)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '0 20px',
    height: 52,
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-surface)',
    flexShrink: 0,
  },
  brand: {
    fontSize: 16,
    letterSpacing: '-0.3px',
    marginRight: 'auto',
  },
  roomInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    background: 'var(--accent)',
    color: '#fff',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '1px',
    padding: '2px 6px',
    borderRadius: 3,
  },
  roomId: {
    fontSize: 12,
    color: 'var(--text-muted)',
    fontFamily: 'var(--mono)',
  },
  timecodeWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    padding: '4px 10px',
    background: 'var(--accent-dim)',
    borderRadius: 4,
    border: '1px solid rgba(230, 5, 1, 0.25)',
  },
  timecode: {
    fontFamily: 'var(--mono)',
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--accent)',
    letterSpacing: '2px',
  },
  timecodeSubLabel: {
    fontSize: 10,
    color: 'var(--text-muted)',
    letterSpacing: '0.3px',
  },
  leaveBtn: {
    fontSize: 13,
    padding: '6px 14px',
  },
  main: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  playerArea: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#000',
    overflow: 'hidden',
  },
  sidebar: {
    width: 300,
    borderLeft: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-surface)',
    flexShrink: 0,
  },
}
