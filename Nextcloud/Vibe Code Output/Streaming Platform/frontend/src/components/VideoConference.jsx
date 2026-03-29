import { useState, useEffect, useRef } from 'react'
import { useDyteClient, DyteProvider } from '@dytesdk/react-web-core'
import { DyteMicToggle, DyteCameraToggle } from '@dytesdk/react-ui-kit'

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787'
const STRIP_HEIGHT = 140
const TILE_W = 150
const TILE_H = 112

// ─── Video tile for a single participant ────────────────────────────────────
function ParticipantTile({ participant, isSelf, onPopout }) {
  const videoRef = useRef(null)
  const [hasVideo, setHasVideo] = useState(
    isSelf ? !!participant?.videoEnabled : !!participant?.videoEnabled
  )

  useEffect(() => {
    const el = videoRef.current
    if (!el) return

    const track = participant?.videoTrack
    if (track && (participant?.videoEnabled ?? true)) {
      el.srcObject = new MediaStream([track])
      setHasVideo(true)
    } else {
      el.srcObject = null
      setHasVideo(false)
    }
  }, [participant?.videoTrack, participant?.videoEnabled])

  // Re-sync on participant updates for remote participants
  useEffect(() => {
    if (!participant || isSelf) return
    const handler = () => {
      const el = videoRef.current
      if (!el) return
      const track = participant.videoTrack
      if (track && participant.videoEnabled) {
        el.srcObject = new MediaStream([track])
        setHasVideo(true)
      } else {
        el.srcObject = null
        setHasVideo(false)
      }
    }
    participant.on?.('videoUpdate', handler)
    return () => participant.off?.('videoUpdate', handler)
  }, [participant, isSelf])

  const displayName = (isSelf ? 'You' : participant?.name) || 'Participant'
  const initial = displayName[0]?.toUpperCase() || '?'

  return (
    <div style={tileStyles.wrap}>
      <video
        ref={videoRef}
        autoPlay
        muted={isSelf}
        playsInline
        style={tileStyles.video}
      />
      {!hasVideo && (
        <div style={tileStyles.avatar}>
          <span style={tileStyles.avatarInitial}>{initial}</span>
        </div>
      )}
      <div style={tileStyles.nameBar}>{displayName}</div>
      <button style={tileStyles.popoutBtn} onClick={onPopout} title="Pop out">
        ⤢
      </button>
    </div>
  )
}

// ─── Draggable pop-out window ────────────────────────────────────────────────
function PopoutWindow({ participant, isSelf, onClose }) {
  const videoRef = useRef(null)
  const [pos, setPos] = useState({ x: 80, y: 80 })
  const dragging = useRef(false)
  const origin = useRef({ mx: 0, my: 0, px: 0, py: 0 })

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    const track = participant?.videoTrack
    if (track && (participant?.videoEnabled ?? true)) {
      el.srcObject = new MediaStream([track])
    }
  }, [participant?.videoTrack, participant?.videoEnabled])

  useEffect(() => {
    function onMove(e) {
      if (!dragging.current) return
      setPos({
        x: origin.current.px + (e.clientX - origin.current.mx),
        y: origin.current.py + (e.clientY - origin.current.my),
      })
    }
    function onUp() { dragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  function startDrag(e) {
    dragging.current = true
    origin.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y }
  }

  const displayName = (isSelf ? 'You' : participant?.name) || 'Participant'

  return (
    <div style={{ ...popoutStyles.window, left: pos.x, top: pos.y }}>
      <div style={popoutStyles.titleBar} onMouseDown={startDrag}>
        <span style={popoutStyles.title}>{displayName}</span>
        <button style={popoutStyles.closeBtn} onMouseDown={(e) => e.stopPropagation()} onClick={onClose}>✕</button>
      </div>
      <div style={popoutStyles.videoWrap}>
        <video ref={videoRef} autoPlay muted={isSelf} playsInline style={popoutStyles.video} />
      </div>
    </div>
  )
}

// ─── Main VideoConference strip ──────────────────────────────────────────────
export default function VideoConference({ participantName, role, roomId, collapsed, onToggleCollapse }) {
  const [meeting, initMeeting] = useDyteClient()
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [participants, setParticipants] = useState([])
  const [popouts, setPopouts] = useState({}) // peerId -> participant

  // ── Dyte initialisation ────────────────────────────────────────────────────
  useEffect(() => {
    if (!participantName || !roomId) return

    async function join() {
      setStatus('loading')
      try {
        const cachedMeetingId = sessionStorage.getItem('dcc_meeting_id') || undefined
        const res = await fetch(`${WORKER_URL}/api/meeting/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantName, role, roomId, meetingId: cachedMeetingId }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to get meeting token')
        }
        const { token, meetingId } = await res.json()
        sessionStorage.setItem('dcc_meeting_id', meetingId)

        const client = await initMeeting({
          authToken: token,
          defaults: { audio: false, video: false },
        })
        if (client) {
          await client.join()
          setStatus('joined')
        }
      } catch (err) {
        setErrorMsg(err.message)
        setStatus('error')
      }
    }

    join()
  }, [participantName, role, roomId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync participant list from Dyte ────────────────────────────────────────
  useEffect(() => {
    if (!meeting || status !== 'joined') return

    function sync() {
      const joined = meeting.participants?.joined
      if (!joined) { setParticipants([]); return }
      // DyteParticipantMap — try toArray(), else spread values
      const arr = typeof joined.toArray === 'function'
        ? joined.toArray()
        : [...(joined.values?.() ?? [])]
      setParticipants(arr)
    }

    sync()
    meeting.participants?.joined?.on?.('participantsUpdate', sync)
    return () => meeting.participants?.joined?.off?.('participantsUpdate', sync)
  }, [meeting, status])

  // ── Pop-out helpers ────────────────────────────────────────────────────────
  function openPopout(peerId, participant, isSelf) {
    setPopouts((p) => ({ ...p, [peerId]: { participant, isSelf } }))
  }
  function closePopout(peerId) {
    setPopouts((p) => { const n = { ...p }; delete n[peerId]; return n })
  }

  const isJoined = status === 'joined' && !!meeting

  return (
    <>
      {/* ── Floating pop-out windows ── */}
      {Object.entries(popouts).map(([peerId, { participant, isSelf }]) => (
        <PopoutWindow
          key={peerId}
          participant={participant}
          isSelf={isSelf}
          onClose={() => closePopout(peerId)}
        />
      ))}

      {/* ── Bottom strip ── */}
      <div style={stripStyles.outer}>
        {/* Toggle bar — always visible */}
        <button style={stripStyles.toggleBar} onClick={onToggleCollapse}>
          <span style={stripStyles.toggleLabel}>
            {isJoined && <span style={stripStyles.liveIndicator} />}
            Video Conference
          </span>
          {isJoined && (
            <DyteProvider value={meeting}>
              <span style={stripStyles.controls} onClick={(e) => e.stopPropagation()}>
                <DyteMicToggle meeting={meeting} size="sm" />
                <DyteCameraToggle meeting={meeting} size="sm" />
              </span>
            </DyteProvider>
          )}
          <span style={stripStyles.chevron}>{collapsed ? '▲' : '▼'}</span>
        </button>

        {/* Tile strip — hidden when collapsed */}
        {!collapsed && (
          <div style={stripStyles.tileRow}>
            {(status === 'idle' || status === 'loading') && (
              <p style={stripStyles.msg}>
                {status === 'loading' ? 'Joining meeting…' : 'Connecting…'}
              </p>
            )}
            {status === 'error' && (
              <p style={{ ...stripStyles.msg, color: 'var(--error)' }}>{errorMsg}</p>
            )}
            {isJoined && (
              <>
                {/* Local (self) tile */}
                <ParticipantTile
                  key="self"
                  participant={meeting.self}
                  isSelf
                  onPopout={() => openPopout('self', meeting.self, true)}
                />
                {/* Remote participants */}
                {participants.map((p) => (
                  <ParticipantTile
                    key={p.id}
                    participant={p}
                    isSelf={false}
                    onPopout={() => openPopout(p.id, p, false)}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const stripStyles = {
  outer: {
    flexShrink: 0,
    background: 'var(--bg-surface)',
    borderTop: '1px solid var(--border)',
  },
  toggleBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    height: 28,
    padding: '0 12px',
    background: 'var(--bg-raised)',
    border: 'none',
    borderBottom: '1px solid var(--border)',
    color: 'var(--text-head)',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    textAlign: 'left',
  },
  toggleLabel: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  liveIndicator: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: 'var(--success)',
    display: 'inline-block',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  chevron: {
    fontSize: 9,
    color: 'var(--text-muted)',
  },
  tileRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    height: STRIP_HEIGHT - 28,
    overflowX: 'auto',
    overflowY: 'hidden',
  },
  msg: {
    fontSize: 12,
    color: 'var(--text-muted)',
    margin: 0,
    padding: '0 8px',
  },
}

const tileStyles = {
  wrap: {
    position: 'relative',
    width: TILE_W,
    minWidth: TILE_W,
    height: TILE_H,
    borderRadius: 6,
    overflow: 'hidden',
    background: '#111',
    border: '1px solid var(--border)',
    flexShrink: 0,
  },
  video: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  avatar: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-raised)',
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: 700,
    color: 'var(--text-muted)',
  },
  nameBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '3px 6px',
    background: 'rgba(0,0,0,0.6)',
    fontSize: 11,
    color: '#fff',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },
  popoutBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    background: 'rgba(0,0,0,0.5)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 4,
    color: '#fff',
    fontSize: 13,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    lineHeight: 1,
  },
}

const popoutStyles = {
  window: {
    position: 'fixed',
    width: 320,
    height: 240,
    zIndex: 200,
    border: '1px solid var(--border)',
    borderRadius: 8,
    overflow: 'hidden',
    background: '#000',
    boxShadow: 'var(--shadow)',
  },
  titleBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 8px',
    background: 'var(--bg-raised)',
    cursor: 'grab',
    userSelect: 'none',
    borderBottom: '1px solid var(--border)',
  },
  title: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-head)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: 14,
    padding: '0 2px',
    lineHeight: 1,
  },
  videoWrap: {
    height: 'calc(100% - 29px)',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
}
