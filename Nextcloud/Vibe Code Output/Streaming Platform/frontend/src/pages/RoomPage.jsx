import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Chat from '../components/Chat'
import VideoPlayer from '../components/VideoPlayer'
import VideoConference from '../components/VideoConference'
import LaserPointer from '../components/LaserPointer'

const LASER_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316']

function getColor(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return LASER_COLORS[hash % LASER_COLORS.length]
}

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
  const [laserActive, setLaserActive] = useState(false)
  const [localLaserPos, setLocalLaserPos] = useState(null)
  const [remoteLasers, setRemoteLasers] = useState({})
  const linksRef = useRef(null)
  const chatRef = useRef(null)
  const lastLaserRef = useRef(0)
  const myColor = getColor(name)

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

  function toggleLaser() {
    if (laserActive) {
      chatRef.current?.send({ type: 'laser_off', name })
      setLocalLaserPos(null)
    }
    setLaserActive((prev) => !prev)
  }

  const handleVideoMouseMove = useCallback((e) => {
    if (!laserActive) return
    const now = Date.now()
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    // Always update local dot immediately (no throttle)
    setLocalLaserPos({ x, y, color: myColor })
    // Throttle the broadcast to 30ms
    if (now - lastLaserRef.current < 30) return
    lastLaserRef.current = now
    console.log('[laser] broadcasting', x.toFixed(1), y.toFixed(1))
    chatRef.current?.send({ type: 'laser', x, y, name, color: myColor })
  }, [laserActive, name, myColor])

  function handleVideoMouseLeave() {
    if (!laserActive) return
    setLocalLaserPos(null)
    chatRef.current?.send({ type: 'laser_off', name })
  }

  function handleLaserMessage(msg) {
    if (msg.type === 'laser') {
      setRemoteLasers((prev) => ({
        ...prev,
        [msg.name]: { x: msg.x, y: msg.y, color: msg.color, ts: Date.now() },
      }))
    } else if (msg.type === 'laser_off') {
      setRemoteLasers((prev) => {
        const next = { ...prev }
        delete next[msg.name]
        return next
      })
    }
  }

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

        {/* Laser pointer toggle */}
        <button
          className="btn btn-ghost"
          style={{ ...styles.laserBtn, ...(laserActive ? styles.laserBtnActive : {}) }}
          onClick={toggleLaser}
          title={laserActive ? 'Laser pointer on — click to turn off' : 'Laser pointer'}
        >
          ◎ Laser
        </button>

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
            <VideoPlayer
              laserActive={laserActive}
              onMouseMove={handleVideoMouseMove}
              onMouseLeave={handleVideoMouseLeave}
            >
              <LaserPointer
                remoteLasers={remoteLasers}
                localLaser={localLaserPos}
                localName={name}
              />
            </VideoPlayer>
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
        <aside style={{ ...styles.sidebar, display: chatOpen ? 'flex' : 'none' }}>
          <Chat ref={chatRef} roomId={roomId} name={name} onLaserMessage={handleLaserMessage} />
        </aside>
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
  laserBtn: {
    fontSize: 13,
    padding: '5px 10px',
    whiteSpace: 'nowrap',
  },
  laserBtnActive: {
    color: 'var(--accent)',
    background: 'var(--accent-dim)',
    border: '1px solid rgba(230,5,1,0.35)',
    borderRadius: 4,
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
