import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787'

export default function JoinPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [roomId, setRoomId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleJoin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${WORKER_URL}/api/room/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, roomId: roomId.trim(), name: name.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to join room')
        return
      }

      // Store display name in session storage for use in the room
      sessionStorage.setItem('dcc_name', name.trim() || 'Guest')
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
        {/* Logo / wordmark */}
        <div style={styles.brand}>
          <span style={styles.brandAccent}>DC</span>
          <span style={styles.brandName}> Color Live</span>
        </div>
        <p style={styles.tagline}>Professional video review, in real time.</p>

        <div className="card" style={styles.card}>
          <h2 style={styles.cardTitle}>Join a Review Room</h2>

          <form onSubmit={handleJoin} style={styles.form}>
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
              Room ID
              <input
                className="input"
                type="text"
                placeholder="Paste the room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                required
                autoComplete="off"
              />
            </label>

            <label style={styles.label}>
              Password
              <input
                className="input"
                type="password"
                placeholder="Enter room password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </label>

            {error && <p className="msg-error">{error}</p>}

            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading || !password || !roomId}
              style={{ width: '100%', marginTop: 4 }}
            >
              {loading ? 'Joining…' : 'Join Room'}
            </button>
          </form>
        </div>

        <p style={styles.footer}>
          Hosting a session?{' '}
          <a href="/host" style={{ color: 'var(--accent)' }}>
            Create a room
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
    marginBottom: 20,
    color: 'var(--text-head)',
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
