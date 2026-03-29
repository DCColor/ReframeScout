import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Chat from '../components/Chat'
import VideoPlayer from '../components/VideoPlayer'
import VideoConference from '../components/VideoConference'

const LINKS = [
  { label: 'DC Color Portal', url: 'https://www.dccolor.com/clientportal' },
  { label: 'DC Color Live Guide', url: 'https://www.dccolor.com/liveguide' },
]

export default function RoomPage() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const name = sessionStorage.getItem('dcc_name') || 'Guest'
  const role = sessionStorage.getItem('dcc_role') || 'guest'

  const [chatOpen, setChatOpen] = useState(true)
  const [stripOpen, setStripOpen] = useState(true)
  const [copied, setCopied] = useState(false)
  const [linksOpen, setLinksOpen] = useState(false)
  const linksRef = useRef(null)

  function copyRoomId() {
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // Close links dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (linksRef.current && !linksRef.current.contains(e.target)) {
        setLinksOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div style={styles.layout}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.brand}>
          <span style={{ color: 'var(--accent)', fontWeight: 700 }}>DC</span>
          <span style={{ color: 'var(--text-head)', fontWeight: 600 }}> Color Live</span>
        </div>

        <div style={styles.roomInfo}>
          <span style={styles.badge}>LIVE</span>
          <span style={styles.roomIdText} title={roomId}>
            Room: {roomId.slice(0, 8)}…
          </span>
          <button
            className="btn btn-ghost"
            style={styles.copyBtn}
            onClick={copyRoomId}
          >
            {copied ? 'Copied!' : 'Copy ID'}
          </button>
        </div>

        {/* Links dropdown */}
        <div style={styles.linksWrap} ref={linksRef}>
          <button
            className="btn btn-ghost"
            style={styles.linksBtn}
            onClick={() => setLinksOpen((o) => !o)}
          >
            Links {linksOpen ? '▲' : '▼'}
          </button>
          {linksOpen && (
            <div style={styles.linksMenu}>
              {LINKS.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.linksItem}
                  onClick={() => setLinksOpen(false)}
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </div>

        <button
          className="btn btn-ghost"
          style={styles.leaveBtn}
          onClick={() => navigate('/')}
        >
          Leave
        </button>
      </header>

      {/* Body */}
      <div style={styles.body}>
        {/* Left column: video player + conference strip */}
        <div style={styles.leftCol}>
          <div style={styles.playerArea}>
            <VideoPlayer />
          </div>
          <VideoConference
            participantName={name}
            role={role}
            roomId={roomId}
            collapsed={!stripOpen}
            onToggleCollapse={() => setStripOpen((s) => !s)}
          />
        </div>

        {/* Chat collapse tab */}
        <button
          style={styles.chatTab}
          onClick={() => setChatOpen((o) => !o)}
          title={chatOpen ? 'Collapse chat' : 'Expand chat'}
        >
          {chatOpen ? '›' : '‹'}
        </button>

        {/* Chat sidebar */}
        {chatOpen && (
          <aside style={styles.sidebar}>
            <Chat roomId={roomId} name={name} />
          </aside>
        )}
      </div>
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
    gap: 12,
    padding: '0 16px',
    height: 48,
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-surface)',
    flexShrink: 0,
  },
  brand: {
    fontSize: 15,
    letterSpacing: '-0.3px',
    marginRight: 'auto',
    whiteSpace: 'nowrap',
  },
  roomInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
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
  roomIdText: {
    fontSize: 12,
    color: 'var(--text-muted)',
    fontFamily: 'var(--mono)',
    whiteSpace: 'nowrap',
  },
  copyBtn: {
    fontSize: 11,
    padding: '3px 8px',
    whiteSpace: 'nowrap',
  },
  linksWrap: {
    position: 'relative',
  },
  linksBtn: {
    fontSize: 13,
    padding: '5px 10px',
    whiteSpace: 'nowrap',
  },
  linksMenu: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    right: 0,
    background: 'var(--bg-raised)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    boxShadow: 'var(--shadow)',
    minWidth: 180,
    zIndex: 100,
    overflow: 'hidden',
  },
  linksItem: {
    display: 'block',
    padding: '9px 14px',
    fontSize: 13,
    color: 'var(--text)',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
  },
  leaveBtn: {
    fontSize: 13,
    padding: '5px 12px',
    whiteSpace: 'nowrap',
  },
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  leftCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minWidth: 0,
  },
  playerArea: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#000',
    overflow: 'hidden',
    minHeight: 0,
  },
  chatTab: {
    width: 20,
    flexShrink: 0,
    background: 'var(--bg-raised)',
    border: 'none',
    borderLeft: '1px solid var(--border)',
    borderRight: '1px solid var(--border)',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  sidebar: {
    width: 300,
    flexShrink: 0,
    borderLeft: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-surface)',
    overflow: 'hidden',
  },
}
