import { useState, useEffect } from 'react'
import { useDyteClient, DyteProvider } from '@dytesdk/react-web-core'
import { DyteGrid, DyteMicToggle, DyteCameraToggle } from '@dytesdk/react-ui-kit'

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787'

export default function VideoConference({ participantName, role, roomId }) {
  const [meeting, initMeeting] = useDyteClient()
  const [collapsed, setCollapsed] = useState(false)
  const [status, setStatus] = useState('idle') // idle | loading | joined | error
  const [errorMsg, setErrorMsg] = useState('')
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

  return (
    <div style={styles.container}>
      {/* Header / collapse toggle */}
      <button style={styles.header} onClick={() => setCollapsed((c) => !c)}>
        <span style={styles.headerIcon}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z" />
          </svg>
        </span>
        <span style={styles.headerLabel}>Video Conference</span>
        {status === 'loading' && <span style={styles.statusDot('loading')} />}
        {status === 'joined'  && <span style={styles.statusDot('joined')} />}
        <span style={styles.collapseIcon}>{collapsed ? '▲' : '▼'}</span>
      </button>

      {!collapsed && (
        <div style={styles.body}>
          {(status === 'idle' || status === 'loading') && (
            <p style={styles.msg}>
              {status === 'loading' ? 'Joining meeting…' : 'Connecting…'}
            </p>
          )}

          {status === 'error' && (
            <p style={{ ...styles.msg, color: 'var(--error)' }}>{errorMsg}</p>
          )}

          {status === 'joined' && meeting && (
            <DyteProvider value={meeting}>
              <div style={styles.grid}>
                <DyteGrid meeting={meeting} style={{ width: '100%', height: '100%' }} />
              </div>

              <div style={styles.controls}>
                <DyteMicToggle meeting={meeting} size="sm" />
                <DyteCameraToggle meeting={meeting} size="sm" />
              </div>
            </DyteProvider>
          )}
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    position: 'fixed',
    bottom: 16,
    left: 16,
    width: 280,
    zIndex: 100,
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: 'var(--shadow)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '8px 12px',
    background: 'var(--bg-raised)',
    border: 'none',
    borderBottom: '1px solid var(--border)',
    color: 'var(--text-head)',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.3px',
    textAlign: 'left',
  },
  headerIcon: {
    color: 'var(--accent)',
    display: 'flex',
    alignItems: 'center',
  },
  headerLabel: {
    flex: 1,
  },
  statusDot: (s) => ({
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: s === 'joined' ? 'var(--success)' : '#f59e0b',
  }),
  collapseIcon: {
    fontSize: 9,
    color: 'var(--text-muted)',
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
  },
  msg: {
    fontSize: 12,
    color: 'var(--text-muted)',
    textAlign: 'center',
    padding: '20px 12px',
    margin: 0,
  },
  grid: {
    height: 180,
    background: '#000',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '8px 12px',
    background: 'var(--bg-raised)',
    borderTop: '1px solid var(--border)',
  },
}
