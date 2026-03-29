import { useState, useEffect, useCallback } from 'react'
import { useDyteClient, DyteProvider } from '@dytesdk/react-web-core'
import { DyteGrid } from '@dytesdk/react-ui-kit'

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787'

export default function VideoConference({ participantName, role, roomId }) {
  const [meeting, initMeeting] = useDyteClient()
  const [collapsed, setCollapsed] = useState(false)
  const [status, setStatus] = useState('idle') // idle | loading | joined | error
  const [errorMsg, setErrorMsg] = useState('')
  const [micOn, setMicOn] = useState(false)
  const [camOn, setCamOn] = useState(false)

  useEffect(() => {
    if (!participantName || !roomId) return

    async function join() {
      setStatus('loading')
      try {
        // Request browser permissions before initialising Dyte so the SDK
        // finds the devices already unlocked and doesn't silently fail.
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
          stream.getTracks().forEach((t) => t.stop()) // release immediately; Dyte takes over
        } catch {
          // Permission denied or no devices — continue without media
        }

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

  const toggleMic = useCallback(async () => {
    if (!meeting) return
    try {
      if (micOn) {
        await meeting.self.disableAudio()
        setMicOn(false)
      } else {
        await meeting.self.enableAudio()
        setMicOn(true)
      }
    } catch (err) {
      console.error('Mic toggle failed:', err)
    }
  }, [meeting, micOn])

  const toggleCam = useCallback(async () => {
    if (!meeting) return
    try {
      if (camOn) {
        await meeting.self.disableVideo()
        setCamOn(false)
      } else {
        await meeting.self.enableVideo()
        setCamOn(true)
      }
    } catch (err) {
      console.error('Camera toggle failed:', err)
    }
  }, [meeting, camOn])

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
                {/* Mic toggle */}
                <button
                  style={styles.ctrlBtn(micOn)}
                  onClick={toggleMic}
                  title={micOn ? 'Mute microphone' : 'Unmute microphone'}
                >
                  {micOn ? (
                    // Mic on
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 0013.938 1.016A5 5 0 0017 11h-2zm-5 9v-2.07A7.001 7.001 0 005.07 12H3a9 9 0 0018 0h-2.07A7.001 7.001 0 0012 20v-1z"/>
                    </svg>
                  ) : (
                    // Mic off (slash)
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 11a7 7 0 01-6.93 7H12v2h4v2H8v-2h4v-2h-.07A7 7 0 015 11H3a9 9 0 008 8.94V22h2v-2.06A9 9 0 0021 11h-2zM9 5a3 3 0 016 0v5.17l1.5 1.5A5 5 0 009.83 4.83L8.34 3.34A7 7 0 0119 11h-2a5 5 0 00-8-4zM3.27 3L2 4.27l4.01 4.01A6.96 6.96 0 005 11H3a9 9 0 0010 8.94V22h2v-2.06c.96-.18 1.87-.52 2.69-.99L21 21.73 22.27 20.46 3.27 3z"/>
                    </svg>
                  )}
                  <span style={styles.ctrlLabel}>{micOn ? 'Mute' : 'Unmute'}</span>
                </button>

                {/* Camera toggle */}
                <button
                  style={styles.ctrlBtn(camOn)}
                  onClick={toggleCam}
                  title={camOn ? 'Turn off camera' : 'Turn on camera'}
                >
                  {camOn ? (
                    // Camera on
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z"/>
                    </svg>
                  ) : (
                    // Camera off (slash)
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M21 6.5l-4 4V7a1 1 0 00-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4a1 1 0 00-1 1v10a1 1 0 001 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z"/>
                    </svg>
                  )}
                  <span style={styles.ctrlLabel}>{camOn ? 'Stop Video' : 'Start Video'}</span>
                </button>
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
  ctrlBtn: (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '6px 12px',
    background: active ? 'var(--bg-surface)' : 'rgba(230, 5, 1, 0.15)',
    border: `1px solid ${active ? 'var(--border)' : 'rgba(230, 5, 1, 0.4)'}`,
    borderRadius: 6,
    color: active ? 'var(--text-head)' : 'var(--accent)',
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 500,
  }),
  ctrlLabel: {
    fontSize: 11,
  },
}
