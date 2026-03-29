import { useState, useEffect, useRef, useCallback } from 'react'

const WORKER_WS_URL = (import.meta.env.VITE_WORKER_URL || 'http://localhost:8787')
  .replace(/^http/, 'ws')

export default function Chat({ roomId, name }) {
  const [messages, setMessages] = useState([])
  const [members, setMembers] = useState([])
  const [draft, setDraft] = useState('')
  const [status, setStatus] = useState('connecting') // connecting | connected | disconnected
  const wsRef = useRef(null)
  const bottomRef = useRef(null)
  const reconnectTimer = useRef(null)
  const pendingSent = useRef([]) // texts sent optimistically, awaiting server echo

  const connect = useCallback(() => {
    const url = `${WORKER_WS_URL}/api/room/${roomId}/websocket?name=${encodeURIComponent(name)}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setStatus('connected')
    }

    ws.onmessage = (e) => {
      let msg
      try { msg = JSON.parse(e.data) } catch { return }

      if (msg.type === 'chat') {
        // Drop server echo for messages we already added optimistically
        if (msg.name === name) {
          const idx = pendingSent.current.indexOf(msg.text)
          if (idx !== -1) {
            pendingSent.current.splice(idx, 1)
            return
          }
        }
        setMessages((prev) => [...prev, msg])
      } else if (msg.type === 'members') {
        setMembers(msg.members)
      } else if (msg.type === 'presence') {
        if (msg.event === 'join') {
          setMembers((prev) => [...prev.filter((m) => m.sessionId !== msg.sessionId), { sessionId: msg.sessionId, name: msg.name }])
          setMessages((prev) => [...prev, { type: 'system', text: `${msg.name} joined`, ts: Date.now() }])
        } else if (msg.event === 'leave') {
          setMembers((prev) => prev.filter((m) => m.sessionId !== msg.sessionId))
          setMessages((prev) => [...prev, { type: 'system', text: `${msg.name} left`, ts: Date.now() }])
        }
      }
    }

    ws.onclose = () => {
      setStatus('disconnected')
      reconnectTimer.current = setTimeout(connect, 3000)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [roomId, name])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function sendMessage(e) {
    e.preventDefault()
    const text = draft.trim()
    if (!text || wsRef.current?.readyState !== WebSocket.OPEN) return
    // Optimistic update — show immediately as a self message
    pendingSent.current.push(text)
    setMessages((prev) => [...prev, { type: 'chat', name, text, ts: Date.now(), _optimistic: true }])
    wsRef.current.send(JSON.stringify({ type: 'chat', text }))
    setDraft('')
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.title}>Chat</span>
        <span style={styles.statusDot(status)} title={status} />
        <span style={styles.memberCount}>{members.length} online</span>
      </div>

      {/* Message list */}
      <div style={styles.messages}>
        {messages.length === 0 && (
          <p style={styles.empty}>No messages yet. Say hello!</p>
        )}
        {messages.map((msg, i) => (
          msg.type === 'system'
            ? <SystemMessage key={i} msg={msg} />
            : <ChatMessage key={i} msg={msg} self={msg.name === name} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} style={styles.inputRow}>
        <input
          className="input"
          style={styles.input}
          type="text"
          placeholder={status === 'connected' ? 'Type a message…' : 'Reconnecting…'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={status !== 'connected'}
          maxLength={500}
        />
        <button
          className="btn btn-primary"
          type="submit"
          style={styles.sendBtn}
          disabled={!draft.trim() || status !== 'connected'}
        >
          Send
        </button>
      </form>
    </div>
  )
}

function ChatMessage({ msg, self }) {
  return (
    <div style={{ ...styles.message, ...(self ? styles.messageSelf : {}) }}>
      {!self && <span style={styles.msgName}>{msg.name}</span>}
      <span style={{ ...styles.msgText, ...(self ? styles.msgTextSelf : {}) }}>{msg.text}</span>
      <span style={styles.msgTime}>{formatTime(msg.ts)}</span>
    </div>
  )
}

function SystemMessage({ msg }) {
  return (
    <div style={styles.systemMsg}>
      {msg.text}
    </div>
  )
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 16px',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  title: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-head)',
    marginRight: 'auto',
  },
  statusDot: (status) => ({
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: status === 'connected' ? 'var(--success)' : status === 'connecting' ? '#f59e0b' : 'var(--error)',
  }),
  memberCount: {
    fontSize: 12,
    color: 'var(--text-muted)',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  empty: {
    color: 'var(--text-muted)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 24,
  },
  message: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    alignItems: 'flex-start',
  },
  messageSelf: {
    alignItems: 'flex-end',
  },
  msgName: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--accent)',
    letterSpacing: '0.2px',
  },
  msgText: {
    background: 'var(--bg-raised)',
    borderRadius: 6,
    padding: '6px 10px',
    fontSize: 13,
    color: 'var(--text-head)',
    maxWidth: '90%',
    wordBreak: 'break-word',
  },
  msgTextSelf: {
    background: 'var(--accent-dim)',
    border: '1px solid rgba(230,5,1,0.25)',
    color: 'var(--text-head)',
  },
  msgTime: {
    fontSize: 10,
    color: 'var(--text-muted)',
  },
  systemMsg: {
    fontSize: 11,
    color: 'var(--text-muted)',
    textAlign: 'center',
    padding: '2px 0',
  },
  inputRow: {
    display: 'flex',
    gap: 8,
    padding: '12px 16px',
    borderTop: '1px solid var(--border)',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    padding: '8px 12px',
    fontSize: 13,
  },
  sendBtn: {
    padding: '8px 14px',
    fontSize: 13,
    flexShrink: 0,
  },
}
