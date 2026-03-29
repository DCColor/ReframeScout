import { useParams, useNavigate } from 'react-router-dom'
import Chat from '../components/Chat'

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
          <div style={styles.playerPlaceholder}>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              Video player will appear here
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>
              Room Connected
            </p>
          </div>
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
  },
  playerPlaceholder: {
    textAlign: 'center',
  },
  sidebar: {
    width: 300,
    borderLeft: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-surface)',
  },
}
