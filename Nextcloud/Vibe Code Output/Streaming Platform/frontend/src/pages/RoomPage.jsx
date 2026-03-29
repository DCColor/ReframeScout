import { useParams, useNavigate } from 'react-router-dom'
import Chat from '../components/Chat'
import VideoPlayer from '../components/VideoPlayer'

export default function RoomPage() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const name = sessionStorage.getItem('dcc_name') || 'Guest'

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

        {/* Timecode display */}
        <div style={styles.timecode}>00:00:00:00</div>

        <button
          className="btn btn-ghost"
          style={styles.leaveBtn}
          onClick={() => navigate('/')}
        >
          Leave
        </button>
      </header>

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
  timecode: {
    fontFamily: 'var(--mono)',
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--accent)',
    letterSpacing: '2px',
    padding: '4px 10px',
    background: 'var(--accent-dim)',
    borderRadius: 4,
    border: '1px solid rgba(224, 90, 30, 0.25)',
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
