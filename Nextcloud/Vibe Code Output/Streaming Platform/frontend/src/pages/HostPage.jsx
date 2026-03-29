import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787'

export default function HostPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${WORKER_URL}/api/room/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create room')
        return
      }

      sessionStorage.setItem('dcc_name', name.trim() || 'Host')
      sessionStorage.setItem('dcc_role', 'host')
      sessionStorage.removeItem('dcc_meeting_id') // fresh meeting for new room
      navigate(`/room/${data.roomId}`)
    } catch {
      setError('Could not reach server. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.brand}>
          <span style={styles.brandAccent}>DC</span>
          <span style={styles.brandName}> Color Live</span>
        </div>
        <p style={styles.tagline}>Professional video review, in real time.</p>

        <div className="card" style={styles.card}>
          <h2 style={styles.cardTitle}>Start a Review Session</h2>
          <p style={styles.cardDesc}>
            A new room will be created. Share the Room ID and session password with participants.
          </p>

          <form onSubmit={handleCreate} style={styles.form}>
            <label style={styles.label}>
              Your Name
              <input
                className="input"
                type="text"
                placeholder="e.g. Robbie Carman"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </label>

            <label style={styles.label}>
              Host PIN
              <input
                className="input"
                type="password"
                placeholder="Enter host PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
                autoComplete="current-password"
              />
            </label>

            {error && <p className="msg-error">{error}</p>}

            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading || !pin}
              style={{ width: '100%', marginTop: 4 }}
            >
              {loading ? 'Creating…' : 'Create Room'}
            </button>
          </form>
        </div>

        <p style={styles.footer}>
          Joining a session?{' '}
          <a href="/" style={{ color: 'var(--accent)' }}>
            Join a room
          </a>
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100svh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    background: 'var(--bg)',
  },
  container: {
    width: '100%',
    maxWidth: 420,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20,
  },
  brand: {
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: '-0.5px',
    color: 'var(--text-head)',
  },
  brandAccent: {
    color: 'var(--accent)',
  },
  brandName: {
    color: 'var(--text-head)',
  },
  tagline: {
    color: 'var(--text-muted)',
    fontSize: 14,
    marginTop: -12,
  },
  card: {
    width: '100%',
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: 8,
    color: 'var(--text-head)',
  },
  cardDesc: {
    fontSize: 13,
    color: 'var(--text-muted)',
    marginBottom: 20,
    lineHeight: 1.5,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text)',
  },
  footer: {
    fontSize: 13,
    color: 'var(--text-muted)',
  },
}
